"""
Smart PME Finance - Client Desktop Windows Natif (PyQt6)
Application Desktop professionnelle pour la gestion commerciale et financière des PME.
Module de Supervision et Contrôle à Distance (Killswitch distant & Verrouillage).
"""

import ctypes
import html
import json
import os
import socket
import sys
import tempfile
import threading
import urllib.error
import urllib.request
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv
from PyQt6.QtCore import QThread, QTimer, QUrl, Qt, pyqtSignal
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout,
    QStatusBar, QLabel, QMenuBar, QMenu, QMessageBox,
    QDialog, QPushButton, QSystemTrayIcon, QStyle
)
from PyQt6.QtGui import QAction, QKeySequence, QIcon, QFont
from PyQt6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile, QWebEngineUrlRequestInterceptor
from PyQt6.QtWebEngineWidgets import QWebEngineView
from local_web_server import create_web_server


def web_asset_directory():
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS) / "web-dist"
    return Path(__file__).resolve().parents[1] / "web" / "dist"


def is_vite_dev_server(port):
    try:
        with urllib.request.urlopen(f"http://localhost:{port}/@vite/client", timeout=1) as response:
            return response.status == 200 and b"createHotContext" in response.read(64 * 1024)
    except Exception:
        return False


def start_local_web_server(api_url):
    port = int(os.environ.get("DESKTOP_LOCAL_WEB_PORT", "5173"))
    server = create_web_server(web_asset_directory(), api_url, port=port)
    thread = threading.Thread(target=server.serve_forever, name="SmartPME-Web", daemon=True)
    thread.start()
    return server


def remove_startup_registration():
    if os.name != "nt":
        return
    try:
        import winreg
        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            0,
            winreg.KEY_SET_VALUE,
        ) as key:
            winreg.DeleteValue(key, "SmartPMEFinance")
    except FileNotFoundError:
        pass
    except OSError as exc:
        print(f"[DEMARRAGE WINDOWS] Impossible de désactiver le lancement automatique: {exc}")


def load_desktop_environment():
    if not getattr(sys, "frozen", False):
        load_dotenv(Path(__file__).resolve().parents[2] / ".env")


def resolve_desktop_target(api_url):
    explicit_url = os.environ.get("DESKTOP_WEB_URL")
    if explicit_url:
        return explicit_url, None

    port = int(os.environ.get("DESKTOP_LOCAL_WEB_PORT", "5173"))
    try:
        server = start_local_web_server(api_url)
    except OSError as error:
        if is_vite_dev_server(port):
            return f"http://localhost:{port}/sales?posMode=cashier&desktopMode=1", None
        raise RuntimeError(
            f"Impossible de démarrer l’interface locale sur le port {port}. "
            "Fermez l’application qui utilise ce port ou choisissez DESKTOP_LOCAL_WEB_PORT."
        ) from error

    return f"{server.base_url}/sales?posMode=cashier", server


def startup_fallback_html(target_url):
    retry_url = html.escape(target_url, quote=True)
    return f"""<!doctype html>
<html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Smart PME Finance — démarrage</title>
<body style="margin:0;background:#f3f6fb;font:16px Segoe UI, sans-serif;color:#0b1f4d">
<main style="max-width:620px;margin:12vh auto;padding:32px;background:white;border-radius:12px">
<h1>Smart PME Finance ne peut pas ouvrir l’interface</h1>
<p>Le serveur local du desktop ou ses fichiers ne sont pas disponibles. Vérifiez l’installation, puis réessayez.</p>
<a href="{retry_url}" style="display:inline-block;padding:12px 18px;background:#0b1f4d;color:white;border-radius:6px;text-decoration:none">
Réessayer</a>
</main></body></html>"""


class DataBlob(ctypes.Structure):
    _fields_ = [("cbData", ctypes.c_uint32), ("pbData", ctypes.POINTER(ctypes.c_ubyte))]


def _dpapi_transform(data, protect):
    if os.name != "nt":
        raise RuntimeError("La protection DPAPI Windows est requise pour le poste desktop.")
    source_buffer = ctypes.create_string_buffer(data)
    source = DataBlob(len(data), ctypes.cast(source_buffer, ctypes.POINTER(ctypes.c_ubyte)))
    output = DataBlob()
    crypt = ctypes.windll.crypt32
    kernel = ctypes.windll.kernel32
    crypt.CryptProtectData.argtypes = [
        ctypes.POINTER(DataBlob), ctypes.c_wchar_p, ctypes.c_void_p,
        ctypes.c_void_p, ctypes.c_void_p, ctypes.c_uint32, ctypes.POINTER(DataBlob),
    ]
    crypt.CryptProtectData.restype = ctypes.c_int
    crypt.CryptUnprotectData.argtypes = [
        ctypes.POINTER(DataBlob), ctypes.POINTER(ctypes.c_wchar_p),
        ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p,
        ctypes.c_uint32, ctypes.POINTER(DataBlob),
    ]
    crypt.CryptUnprotectData.restype = ctypes.c_int
    kernel.LocalFree.argtypes = [ctypes.c_void_p]
    kernel.LocalFree.restype = ctypes.c_void_p
    if protect:
        ok = crypt.CryptProtectData(
            ctypes.byref(source), "Smart PME Desktop", None, None, None, 0x1, ctypes.byref(output)
        )
    else:
        ok = crypt.CryptUnprotectData(
            ctypes.byref(source), None, None, None, None, 0x1, ctypes.byref(output)
        )
    if not ok:
        raise ctypes.WinError()
    try:
        return ctypes.string_at(output.pbData, output.cbData)
    finally:
        kernel.LocalFree(output.pbData)


def load_secure_state(path):
    try:
        state = json.loads(_dpapi_transform(path.read_bytes(), False).decode("utf-8"))
        if not isinstance(state, dict):
            raise ValueError("Format d’état incorrect.")
        return state
    except FileNotFoundError:
        return {}
    except (ValueError, OSError, RuntimeError) as exc:
        raise RuntimeError("État local DPAPI illisible; démarrage refusé par sécurité.") from exc


def save_secure_state(path, state):
    path.parent.mkdir(parents=True, exist_ok=True)
    encrypted = _dpapi_transform(json.dumps(state).encode("utf-8"), True)
    handle, temporary = tempfile.mkstemp(dir=path.parent, prefix="terminal-", suffix=".tmp")
    try:
        with os.fdopen(handle, "wb") as file:
            file.write(encrypted)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


class HeartbeatWorker(QThread):
    succeeded = pyqtSignal(dict)
    failed = pyqtSignal()
    rejected = pyqtSignal()

    def __init__(self, api_url, terminal_token, acknowledged_version):
        super().__init__()
        self.api_url = api_url
        self.terminal_token = terminal_token
        self.acknowledged_version = acknowledged_version

    def run(self):
        try:
            payload = json.dumps({
                "acknowledgedVersion": self.acknowledged_version
            }).encode("utf-8")
            req = urllib.request.Request(
                f"{self.api_url}/remote-control/heartbeat",
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.terminal_token}",
                    "User-Agent": "SmartPME-Desktop/1.0",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                self.succeeded.emit(json.loads(response.read().decode("utf-8")))
        except urllib.error.HTTPError as exc:
            if exc.code in (401, 403):
                self.rejected.emit()
            else:
                print(f"[HEARTBEAT DESKTOP] Réponse HTTP {exc.code}.")
                self.failed.emit()
        except Exception as exc:
            print(f"[HEARTBEAT DESKTOP] Échec du signal: {exc}")
            self.failed.emit()


class EnrollmentWorker(QThread):
    succeeded = pyqtSignal(str)
    failed = pyqtSignal()

    def __init__(self, api_url, enrollment_key, terminal_id, organization_id, display_name):
        super().__init__()
        self.api_url = api_url
        self.enrollment_key = enrollment_key
        self.terminal_id = terminal_id
        self.organization_id = organization_id
        self.display_name = display_name

    def run(self):
        try:
            payload = json.dumps({
                "terminalId": self.terminal_id,
                "organizationId": self.organization_id,
                "displayName": self.display_name,
            }).encode("utf-8")
            request = urllib.request.Request(
                f"{self.api_url}/remote-control/enroll",
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Desktop-Enrollment-Key": self.enrollment_key,
                    "User-Agent": "SmartPME-Desktop/1.0",
                },
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=5) as response:
                token = json.loads(response.read().decode("utf-8"))["terminalToken"]
            self.succeeded.emit(token)
        except Exception as exc:
            print(f"[ENROLEMENT DESKTOP] Échec du réenrôlement: {exc}")
            self.failed.emit()


class TerminalRequestInterceptor(QWebEngineUrlRequestInterceptor):
    def __init__(self, api_url, terminal_id, terminal_token):
        super().__init__()
        api = QUrl(api_url)
        self.api_host = api.host()
        self.api_port = api.port(443 if api.scheme() == "https" else 80)
        self.terminal_id = terminal_id
        self.terminal_token = terminal_token

    def interceptRequest(self, info):
        url = info.requestUrl()
        if url.host() == self.api_host and url.port(443 if url.scheme() == "https" else 80) == self.api_port:
            info.setHttpHeader(b"X-Desktop-Terminal-Id", self.terminal_id.encode("utf-8"))
            info.setHttpHeader(b"X-Desktop-Terminal-Token", self.terminal_token.encode("utf-8"))


class LockOverlayDialog(QDialog):
    """Dialogue modal plein écran de verrouillage à distance déclenché par le manager"""
    def __init__(
        self,
        parent=None,
        reason="Ce poste a été temporairement verrouillé par la Direction.",
        on_reenroll=None,
    ):
        super().__init__(parent)
        self.setWindowTitle("Poste Verrouillé à Distance")
        self.setWindowFlags(Qt.WindowType.WindowStaysOnTopHint | Qt.WindowType.FramelessWindowHint | Qt.WindowType.Dialog)
        self.setModal(True)
        self.setAttribute(Qt.WidgetAttribute.WA_DeleteOnClose, False)
        self.setStyleSheet("background-color: #0F172A; color: #F8FAFC;")
        
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.setSpacing(20)

        title = QLabel("🔒 ACCÈS SUSPENDU À DISTANCE")
        title_font = QFont("Segoe UI", 24, QFont.Weight.Bold)
        title.setFont(title_font)
        title.setStyleSheet("color: #EF4444;")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)

        self.reason_label = QLabel(reason)
        msg_font = QFont("Segoe UI", 13)
        self.reason_label.setFont(msg_font)
        self.reason_label.setStyleSheet("color: #E2E8F0; max-width: 600px;")
        self.reason_label.setWordWrap(True)
        self.reason_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.reason_label)

        self.info_label = QLabel(
            "Veuillez contacter votre Manager ou Administrateur pour débloquer cette session."
        )
        self.info_label.setStyleSheet("color: #94A3B8; font-size: 11px;")
        self.info_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.info_label)

        self.content_layout = layout
        self.reenroll_button = None
        self.set_reenrollment_handler(on_reenroll)

        self.resize(800, 500)

    def set_reenrollment_handler(self, handler):
        if handler and not self.reenroll_button:
            self.reenroll_button = QPushButton("Ré-enrôler ce poste")
            self.reenroll_button.clicked.connect(handler)
            self.content_layout.addWidget(
                self.reenroll_button,
                alignment=Qt.AlignmentFlag.AlignCenter,
            )
        elif not handler and self.reenroll_button:
            self.content_layout.removeWidget(self.reenroll_button)
            self.reenroll_button.deleteLater()
            self.reenroll_button = None

    def set_reenrollment_status(self, message, enabled=True):
        self.info_label.setText(message)
        if self.reenroll_button:
            self.reenroll_button.setEnabled(enabled)
            self.reenroll_button.setText(
                "Ré-enrôler ce poste" if enabled else "Ré-enrôlement en cours..."
            )

    def closeEvent(self, event):
        if self.property("unlocking"):
            event.accept()
        else:
            event.ignore()


class SmartPMEDesktop(QMainWindow):
    def __init__(
        self,
        target_url="http://localhost:5173",
        api_url="http://localhost:3001/api/v1",
        local_web_server=None,
    ):
        super().__init__()
        self.target_url = target_url
        self.api_url = api_url
        self.local_web_server = local_web_server
        
        # Identifiant unique du poste de travail pour le contrôle à distance
        hostname = socket.gethostname() or os.environ.get("COMPUTERNAME", "POSTE-01")
        self.terminal_id = f"DESKTOP-{hostname}"
        self.organization_id = os.environ.get("ORGANIZATION_ID", "")
        self.display_name = os.environ.get("DESKTOP_DISPLAY_NAME", hostname)
        self.enrollment_key = os.environ.get("DESKTOP_ENROLLMENT_SECRET", "")
        app_data = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "SmartPME"
        web_profile_path = app_data / "web-profile"
        (web_profile_path / "storage").mkdir(parents=True, exist_ok=True)
        (web_profile_path / "cache").mkdir(parents=True, exist_ok=True)
        self.web_profile = QWebEngineProfile("SmartPME Finance", self)
        self.web_profile.setPersistentStoragePath(str(web_profile_path / "storage"))
        self.web_profile.setCachePath(str(web_profile_path / "cache"))
        self.web_profile.setPersistentCookiesPolicy(
            QWebEngineProfile.PersistentCookiesPolicy.ForcePersistentCookies
        )
        self.secure_state_path = app_data / "terminal-state.bin"
        self.secure_state = load_secure_state(self.secure_state_path)
        self.terminal_token = self.secure_state.get("terminalToken")
        self.state_version = int(self.secure_state.get("stateVersion", 0))
        self.last_server_time = self.secure_state.get("lastServerTime")
        self.lock_reason = self.secure_state.get("reason") or "Poste verrouillé par la direction."
        self.is_locked = self.secure_state.get("status") == "LOCKED" or not self.terminal_token
        if not self.terminal_token:
            self.lock_reason = "Poste non enrôlé. Configurez l'entreprise et le secret d'enrôlement."
        self.heartbeat_worker = None
        self.enrollment_worker = None
        self.allow_close = False
        self.user_hidden = False
        self.terminal_token_rejected = False
        self.lock_dialog = None
        self.startup_fallback_shown = False

        if self.organization_id and not self.terminal_token:
            self.enroll_terminal()
        if self.terminal_token and not self.last_server_time:
            self.last_server_time = datetime.now(timezone.utc).isoformat()
            self.persist_local_state()

        self.init_ui()
        self.init_menu()
        self.init_status_bar()
        self.init_tray()

        if self.is_locked:
            self.handle_remote_lock(self.lock_reason)

        # Timer pour vérifier la santé du serveur backend toutes les 15 secondes
        self.health_timer = QTimer(self)
        self.health_timer.timeout.connect(self.check_backend_health)
        self.health_timer.start(15000)
        self.check_backend_health()

        # Heartbeat de contrôle distant configurable, entre 10 et 30 secondes.
        self.remote_control_timer = QTimer(self)
        self.remote_control_timer.timeout.connect(self.check_remote_control)
        interval = int(os.environ.get("DESKTOP_HEARTBEAT_SECONDS", "15"))
        interval = max(10, min(interval, 30))
        self.remote_control_timer.start(interval * 1000)
        self.check_remote_control()

    def enroll_terminal(self):
        if not self.enrollment_key:
            return
        try:
            payload = json.dumps({
                "terminalId": self.terminal_id,
                "organizationId": self.organization_id,
                "displayName": self.display_name,
            }).encode("utf-8")
            request = urllib.request.Request(
                f"{self.api_url}/remote-control/enroll",
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Desktop-Enrollment-Key": self.enrollment_key,
                    "User-Agent": "SmartPME-Desktop/1.0",
                },
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=5) as response:
                self.terminal_token = json.loads(response.read().decode("utf-8"))["terminalToken"]
            if hasattr(self, "request_interceptor"):
                self.request_interceptor.terminal_token = self.terminal_token
            self.persist_local_state()
        except Exception as exc:
            print(f"[ENROLEMENT DESKTOP] {exc}")

    def persist_local_state(self):
        save_secure_state(self.secure_state_path, {
            "terminalToken": self.terminal_token,
            "status": "LOCKED" if self.is_locked else "ACTIVE",
            "reason": self.lock_reason,
            "stateVersion": self.state_version,
            "lastServerTime": self.last_server_time,
        })

    def init_tray(self):
        self.tray = QSystemTrayIcon(
            QApplication.style().standardIcon(QStyle.StandardPixmap.SP_ComputerIcon),
            self,
        )
        self.tray.setToolTip("Smart PME Finance")
        menu = QMenu()
        restore_action = QAction("Afficher Smart PME Finance", self)
        restore_action.triggered.connect(self.restore_window)
        menu.addAction(restore_action)
        hide_action = QAction("Masquer la fenêtre", self)
        hide_action.triggered.connect(self.hide_window)
        menu.addAction(hide_action)
        menu.addSeparator()
        self.tray_quit_action = QAction("Quitter", self)
        self.tray_quit_action.triggered.connect(self.quit_application)
        menu.addAction(self.tray_quit_action)
        self.tray.setContextMenu(menu)
        self.tray.activated.connect(lambda reason: self.restore_window()
                                    if reason == QSystemTrayIcon.ActivationReason.Trigger else None)
        self.tray.show()
        self.update_tray_lock_state()

    def restore_window(self):
        self.user_hidden = False
        self.showNormal()
        self.raise_()
        self.activateWindow()
        if self.is_locked:
            self.handle_remote_lock(self.lock_reason)

    def hide_window(self):
        self.user_hidden = True
        if self.lock_dialog:
            self.lock_dialog.hide()
        self.hide()

    def update_tray_lock_state(self):
        if hasattr(self, "tray_quit_action"):
            self.tray_quit_action.setEnabled(not self.is_locked)

    def quit_application(self):
        if self.is_locked:
            return
        self.allow_close = True
        QApplication.quit()

    def init_ui(self):
        self.setWindowTitle(f"Smart PME Finance - Poste Desktop [{self.terminal_id}]")
        screen = QApplication.primaryScreen()
        if screen:
            available = screen.availableGeometry()
            width = min(1100, int(available.width() * 0.8))
            height = min(720, int(available.height() * 0.8))
            self.setMinimumSize(min(800, width), min(550, height))
            self.setGeometry(
                available.x() + (available.width() - width) // 2,
                available.y() + (available.height() - height) // 2,
                width,
                height,
            )
        else:
            self.resize(1100, 720)
            self.setMinimumSize(800, 550)

        # Conteneur principal
        central_widget = QWidget(self)
        layout = QVBoxLayout(central_widget)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Moteur WebEngine (Chromium intégré via Qt6)
        self.request_interceptor = TerminalRequestInterceptor(
            self.api_url,
            self.terminal_id,
            self.terminal_token or "",
        )
        self.web_profile.setUrlRequestInterceptor(self.request_interceptor)
        self.browser = QWebEngineView(self)
        self.browser.setPage(QWebEnginePage(self.web_profile, self.browser))

        # Gestion des titres et chargements
        self.browser.loadStarted.connect(self.on_load_started)
        self.browser.loadFinished.connect(self.on_load_finished)
        self.browser.setUrl(QUrl(self.target_url))

        layout.addWidget(self.browser)
        self.setCentralWidget(central_widget)

    def init_menu(self):
        menubar = self.menuBar()

        # Menu Fichier
        file_menu = menubar.addMenu("&Fichier")

        print_action = QAction("&Imprimer la page ou le reçu", self)
        print_action.setShortcut(QKeySequence.StandardKey.Print)
        print_action.triggered.connect(self.print_current_page)
        file_menu.addAction(print_action)

        file_menu.addSeparator()

        hide_action = QAction("&Masquer dans la zone de notification", self)
        hide_action.triggered.connect(self.hide_window)
        file_menu.addAction(hide_action)

        quit_action = QAction("&Quitter", self)
        quit_action.setShortcut(QKeySequence.StandardKey.Quit)
        quit_action.triggered.connect(self.quit_application)
        file_menu.addAction(quit_action)

        # Menu Affichage
        view_menu = menubar.addMenu("&Affichage")

        reload_action = QAction("&Recharger", self)
        reload_action.setShortcut(QKeySequence.StandardKey.Refresh)
        reload_action.triggered.connect(self.browser.reload)
        view_menu.addAction(reload_action)

        fullscreen_action = QAction("Plein écran", self)
        fullscreen_action.setShortcut(QKeySequence("F11"))
        fullscreen_action.triggered.connect(self.toggle_fullscreen)
        view_menu.addAction(fullscreen_action)

        # Menu Supervision & Outils
        tools_menu = menubar.addMenu("&Supervision")

        check_api_action = QAction("Tester la liaison Serveur Central", self)
        check_api_action.triggered.connect(self.check_backend_health_manual)
        tools_menu.addAction(check_api_action)

        remote_status_action = QAction("Statut Contrôle à Distance", self)
        remote_status_action.triggered.connect(self.show_remote_status)
        tools_menu.addAction(remote_status_action)

        # Menu Aide
        help_menu = menubar.addMenu("&Aide")
        about_action = QAction("À propos de Smart PME Finance", self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)

    def init_status_bar(self):
        self.status = QStatusBar()
        self.setStatusBar(self.status)

        # Label d'ID Terminal
        self.terminal_id_label = QLabel(f"Poste : {self.terminal_id}")
        self.terminal_id_label.setStyleSheet("padding: 2px 8px; font-size: 11px; color: #475569; font-weight: bold;")
        self.status.addPermanentWidget(self.terminal_id_label)

        # Label Contrôle à distance
        self.remote_status_label = QLabel("Supervision : Vérification...")
        self.remote_status_label.setStyleSheet("padding: 2px 8px; font-size: 11px; color: #0284C7;")
        self.remote_status_label.setToolTip("Heartbeat et verrouillage à distance. Ce statut ne représente pas la synchronisation commerciale.")
        self.status.addPermanentWidget(self.remote_status_label)

        # L'API est supervisée ici; la file métier est gérée et affichée par l'application web intégrée.
        self.api_status_label = QLabel("API : Vérification...")
        self.api_status_label.setStyleSheet("padding: 2px 8px; font-size: 11px;")
        self.api_status_label.setToolTip("Disponibilité de l'API uniquement. Consultez l’indicateur de l’application pour l’état des opérations hors-ligne.")
        self.status.addPermanentWidget(self.api_status_label)

    def on_load_started(self):
        self.status.showMessage("Chargement de l'interface...", 2000)

    def on_load_finished(self, success):
        if success:
            self.startup_fallback_shown = False
            self.status.showMessage("Application connectée et prête.", 3000)
        else:
            self.status.showMessage("Mode déconnecté ou serveur indisponible.", 5000)
            if not self.startup_fallback_shown:
                self.startup_fallback_shown = True
                self.browser.setHtml(startup_fallback_html(self.target_url), QUrl(self.target_url))

    def print_current_page(self):
        """Déclenche le dialogue d'impression natif du système pour factures/tickets."""
        self.browser.page().printToPdf(lambda data: None)
        self.browser.page().runJavaScript("window.print();")

    def toggle_fullscreen(self):
        if self.isFullScreen():
            self.showNormal()
        else:
            self.showFullScreen()

    def check_backend_health(self):
        """Vérification en tâche de fond de l'état de l'API NestJS."""
        try:
            req = urllib.request.Request(
                f"{self.api_url}/health",
                headers={"User-Agent": "SmartPME-Desktop/1.0"}
            )
            with urllib.request.urlopen(req, timeout=3) as response:
                if response.status == 200:
                    self.api_status_label.setText("API : En ligne")
                    self.api_status_label.setStyleSheet("padding: 2px 8px; font-size: 11px; color: #166534; font-weight: bold;")
                else:
                    self.api_status_label.setText("API : Réponse anormale")
                    self.api_status_label.setStyleSheet("padding: 2px 8px; font-size: 11px; color: #B45309;")
        except Exception:
            self.api_status_label.setText("API : Hors-Ligne")
            self.api_status_label.setStyleSheet("padding: 2px 8px; font-size: 11px; color: #991B1B; font-weight: bold;")

    def check_remote_control(self):
        if not self.terminal_token:
            if self.organization_id and self.enrollment_key:
                self.enroll_terminal()
            if not self.terminal_token:
                self.remote_status_label.setText("Supervision : poste non enrôlé")
                return

        if self.heartbeat_worker and self.heartbeat_worker.isRunning():
            return
        self.heartbeat_worker = HeartbeatWorker(
            self.api_url,
            self.terminal_token,
            self.state_version,
        )
        self.heartbeat_worker.succeeded.connect(self.apply_server_state)
        self.heartbeat_worker.failed.connect(self.handle_heartbeat_failure)
        self.heartbeat_worker.rejected.connect(self.handle_terminal_rejection)
        self.heartbeat_worker.start()

    def handle_terminal_rejection(self):
        self.terminal_token_rejected = True
        self.lock_reason = "Jeton du poste invalide ou révoqué. Contactez un administrateur pour le réenrôlement."
        self.handle_remote_lock(self.lock_reason)
        self.remote_status_label.setText("Supervision : jeton révoqué")

    def start_reenrollment(self):
        if not self.enrollment_key or not self.organization_id:
            return
        if self.enrollment_worker and self.enrollment_worker.isRunning():
            return

        self.lock_dialog.set_reenrollment_status(
            "Réenrôlement sécurisé en cours. Le serveur décidera si le poste est verrouillé ou actif.",
            enabled=False,
        )
        self.enrollment_worker = EnrollmentWorker(
            self.api_url,
            self.enrollment_key,
            self.terminal_id,
            self.organization_id,
            self.display_name,
        )
        self.enrollment_worker.succeeded.connect(self.complete_reenrollment)
        self.enrollment_worker.failed.connect(self.fail_reenrollment)
        self.enrollment_worker.start()

    def complete_reenrollment(self, terminal_token):
        self.terminal_token = terminal_token
        self.terminal_token_rejected = False
        self.request_interceptor.terminal_token = terminal_token
        self.persist_local_state()
        self.lock_dialog.set_reenrollment_handler(None)
        self.lock_dialog.set_reenrollment_status(
            "Poste réenrôlé. Le poste reste verrouillé jusqu’à son déverrouillage par un administrateur."
        )
        QTimer.singleShot(1000, self.check_remote_control)

    def fail_reenrollment(self):
        self.lock_dialog.set_reenrollment_status(
            "Échec du réenrôlement. Vérifiez la connexion, l’entreprise et le secret administrateur."
        )

    def apply_server_state(self, response):
        self.terminal_token_rejected = False
        self.state_version = response["stateVersion"]
        self.last_server_time = response["serverTime"]
        if response["status"] == "LOCKED":
            self.handle_remote_lock(response.get("reason") or "Poste verrouillé par la direction.")
        else:
            self.handle_remote_unlock()
        self.persist_local_state()
        self.remote_status_label.setText(
            "Supervision : Connecté · état appliqué"
            if response.get("acknowledged")
            else "Supervision : Connecté · accusé transmis"
        )
        self.remote_status_label.setStyleSheet(
            "padding: 2px 8px; font-size: 11px; color: #0284C7;"
        )

    def handle_heartbeat_failure(self):
        self.remote_status_label.setText("Supervision : Hors ligne")
        self.remote_status_label.setStyleSheet(
            "padding: 2px 8px; font-size: 11px; color: #991B1B; font-weight: bold;"
        )
        if self.is_locked:
            self.handle_remote_lock(self.lock_reason)
            return

        grace_hours = max(0, min(
            int(os.environ.get("DESKTOP_OFFLINE_GRACE_HOURS", "24")),
            168,
        ))
        try:
            verified_at = datetime.fromisoformat(self.last_server_time.replace("Z", "+00:00"))
            offline_hours = (
                datetime.now(timezone.utc) - verified_at.astimezone(timezone.utc)
            ).total_seconds() / 3600
        except (AttributeError, ValueError):
            offline_hours = 0
        if offline_hours >= grace_hours:
            self.lock_reason = "Délai de travail hors ligne expiré; attente de validation du serveur."
            self.handle_remote_lock(self.lock_reason)
            self.persist_local_state()

    def closeEvent(self, event):
        if self.allow_close and not self.is_locked:
            event.accept()
            self.tray.hide()
            return
        if self.is_locked:
            self.handle_remote_lock(self.lock_reason)
        self.hide_window()
        event.ignore()

    def handle_remote_lock(self, reason):
        self.is_locked = True
        self.lock_reason = reason
        self.persist_local_state()
        self.update_tray_lock_state()
        if not self.lock_dialog:
            self.lock_dialog = LockOverlayDialog(
                self,
                reason=reason,
            )
        else:
            self.lock_dialog.reason_label.setText(reason)
        can_reenroll = bool(
            self.terminal_token_rejected
            and self.organization_id
            and self.enrollment_key
        )
        self.lock_dialog.set_reenrollment_handler(
            self.start_reenrollment if can_reenroll else None
        )
        if self.terminal_token_rejected and not can_reenroll:
            self.lock_dialog.set_reenrollment_status(
                "Jeton révoqué. Un administrateur doit configurer l'entreprise et le secret d'enrôlement."
            )
        if not self.user_hidden:
            self.lock_dialog.show()

    def handle_remote_unlock(self):
        self.is_locked = False
        self.lock_reason = ""
        self.update_tray_lock_state()
        if self.lock_dialog and self.lock_dialog.isVisible():
            self.lock_dialog.setProperty("unlocking", True)
            self.lock_dialog.close()
            self.lock_dialog = None
            self.status.showMessage("Poste déverrouillé à distance par le Manager.", 4000)
        self.persist_local_state()

    def show_remote_status(self):
        QMessageBox.information(
            self,
            "Contrôle à Distance & Supervision",
            f"<b>Identifiant de ce terminal :</b> {self.terminal_id}<br>"
            f"<b>Organisation rattachée :</b> {self.organization_id}<br>"
            f"<b>Liaison de commande :</b> Active sur {self.api_url}/remote-control<br><br>"
            "Ce poste de travail est supervisé en temps réel par les managers habilités.<br>"
            "Le verrouillage d'urgence et la fermeture à distance (Kill switch) sont opérationnels."
        )

    def check_backend_health_manual(self):
        self.check_backend_health()
        QMessageBox.information(
            self,
            "État du Serveur",
            f"Vérification effectuée auprès du serveur backend :\n{self.api_url}\n\nStatut actuel : {self.api_status_label.text()}"
        )

    def show_about(self):
        QMessageBox.about(
            self,
            "À propos de Smart PME Finance",
            "<h3>Smart PME Finance</h3>"
            "<p><b>Version :</b> 1.0.0 (Production Desktop avec Contrôle à Distance)</p>"
            "<p>Plateforme intégrée de gestion commerciale et financière pour PME.</p>"
            "<p>Développé avec PyQt6 (Qt WebEngine natif Windows), NestJS et PostgreSQL.</p>"
            "<p>Fonctionnalités avancées : Contrôle & Arrêt à distance, Session de caisse aveugle, Multi-devises CDF/USD, Facturation QR Fiscal.</p>"
        )


def main():
    load_desktop_environment()
    os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = "--disable-logging --no-sandbox"
    
    app = QApplication(sys.argv)
    app.setApplicationName("Smart PME Finance")
    app.setOrganizationName("Smart PME SARL")
    remove_startup_registration()

    api_url = os.environ.get("DESKTOP_API_URL", "http://localhost:3001/api/v1")
    try:
        target_url, local_web_server = resolve_desktop_target(api_url)
    except (OSError, RuntimeError, ValueError) as error:
        QMessageBox.critical(
            None,
            "Démarrage impossible",
            f"Smart PME Finance n’a pas pu démarrer son interface locale.\n\n{error}\n\n"
            "Lancez npm run build:web puis réessayez.",
        )
        return 1

    window = SmartPMEDesktop(
        target_url=target_url,
        api_url=api_url,
        local_web_server=local_web_server,
    )
    if local_web_server:
        app.aboutToQuit.connect(local_web_server.shutdown)
    window.show()
    window.raise_()
    window.activateWindow()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()

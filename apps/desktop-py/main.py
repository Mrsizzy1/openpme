"""
Smart PME Finance - Client Desktop Windows Natif (PyQt6)
Application Desktop professionnelle pour la gestion commerciale et financière des PME.
Module de Supervision et Contrôle à Distance (Killswitch distant & Verrouillage).
"""

import sys
import os
import urllib.request
import json
import socket
from PyQt6.QtCore import QUrl, Qt, QTimer
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout,
    QStatusBar, QLabel, QMenuBar, QMenu, QMessageBox,
    QDialog, QPushButton
)
from PyQt6.QtGui import QAction, QKeySequence, QIcon, QFont
from PyQt6.QtWebEngineWidgets import QWebEngineView


class LockOverlayDialog(QDialog):
    """Dialogue modal plein écran de verrouillage à distance déclenché par le manager"""
    def __init__(self, parent=None, reason="Ce poste a été temporairement verrouillé par la Direction."):
        super().__init__(parent)
        self.setWindowTitle("Poste Verrouillé à Distance")
        self.setWindowFlags(Qt.WindowType.WindowStaysOnTopHint | Qt.WindowType.FramelessWindowHint | Qt.WindowType.Dialog)
        self.setModal(True)
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

        msg = QLabel(reason)
        msg_font = QFont("Segoe UI", 13)
        msg.setFont(msg_font)
        msg.setStyleSheet("color: #E2E8F0; max-width: 600px;")
        msg.setWordWrap(True)
        msg.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(msg)

        info = QLabel("Veuillez contacter votre Manager ou Administrateur pour débloquer cette session.")
        info.setStyleSheet("color: #94A3B8; font-size: 11px;")
        info.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(info)

        self.resize(800, 500)


class SmartPMEDesktop(QMainWindow):
    def __init__(self, target_url="http://localhost:5173", api_url="http://localhost:3001/api/v1"):
        super().__init__()
        self.target_url = target_url
        self.api_url = api_url
        
        # Identifiant unique du poste de travail pour le contrôle à distance
        hostname = socket.gethostname() or os.environ.get("COMPUTERNAME", "POSTE-01")
        self.terminal_id = f"DESKTOP-{hostname}"
        self.organization_id = os.environ.get("ORGANIZATION_ID", "org-pme-demo")
        self.lock_dialog = None

        self.init_ui()
        self.init_menu()
        self.init_status_bar()

        # Timer pour vérifier la santé du serveur backend toutes les 15 secondes
        self.health_timer = QTimer(self)
        self.health_timer.timeout.connect(self.check_backend_health)
        self.health_timer.start(15000)
        self.check_backend_health()

        # Timer pour le contrôle à distance et le Kill Switch (toutes les 4 secondes)
        self.remote_control_timer = QTimer(self)
        self.remote_control_timer.timeout.connect(self.check_remote_control)
        self.remote_control_timer.start(4000)
        self.check_remote_control()

    def init_ui(self):
        self.setWindowTitle(f"Smart PME Finance - Poste Desktop [{self.terminal_id}]")
        self.resize(1366, 850)
        self.setMinimumSize(1024, 700)

        # Conteneur principal
        central_widget = QWidget(self)
        layout = QVBoxLayout(central_widget)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Moteur WebEngine (Chromium intégré via Qt6)
        self.browser = QWebEngineView(self)
        self.browser.setUrl(QUrl(self.target_url))
        
        # Gestion des titres et chargements
        self.browser.loadStarted.connect(self.on_load_started)
        self.browser.loadFinished.connect(self.on_load_finished)

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

        quit_action = QAction("&Quitter l'application", self)
        quit_action.setShortcut(QKeySequence.StandardKey.Quit)
        quit_action.triggered.connect(self.close)
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
        self.remote_status_label = QLabel("Supervision à distance : Active")
        self.remote_status_label.setStyleSheet("padding: 2px 8px; font-size: 11px; color: #0284C7;")
        self.status.addPermanentWidget(self.remote_status_label)

        # Label d'état du serveur
        self.api_status_label = QLabel("Serveur : Vérification...")
        self.api_status_label.setStyleSheet("padding: 2px 8px; font-size: 11px;")
        self.status.addPermanentWidget(self.api_status_label)

    def on_load_started(self):
        self.status.showMessage("Chargement de l'interface...", 2000)

    def on_load_finished(self, success):
        if success:
            self.status.showMessage("Application connectée et prête.", 3000)
        else:
            self.status.showMessage("Mode déconnecté ou serveur indisponible.", 5000)

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
                    self.api_status_label.setText("Serveur : En ligne")
                    self.api_status_label.setStyleSheet("padding: 2px 8px; font-size: 11px; color: #166534; font-weight: bold;")
                else:
                    self.api_status_label.setText("Serveur : Réponse anormale")
                    self.api_status_label.setStyleSheet("padding: 2px 8px; font-size: 11px; color: #B45309;")
        except Exception:
            self.api_status_label.setText("Serveur : Hors-Ligne")
            self.api_status_label.setStyleSheet("padding: 2px 8px; font-size: 11px; color: #991B1B; font-weight: bold;")

    def check_remote_control(self):
        """
        Envoi du signal de présence (Heartbeat) au serveur central et exécution
        des ordres à distance du Manager / Propriétaire :
        - KILL : Fermeture immédiate du logiciel à distance (Kill switch)
        - LOCK : Verrouillage de l'écran du poste
        - UNLOCK : Déverrouillage de l'écran
        """
        try:
            payload = json.dumps({
                "terminalId": self.terminal_id,
                "organizationId": self.organization_id,
                "clientType": "DESKTOP_PYQT"
            }).encode("utf-8")

            req = urllib.request.Request(
                f"{self.api_url}/remote-control/heartbeat",
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "SmartPME-Desktop/1.0"
                },
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=3) as response:
                if response.status in (200, 201):
                    res_body = json.loads(response.read().decode("utf-8"))
                    action = res_body.get("action", "NONE")
                    message = res_body.get("message", "")

                    # 1. Traitement de l'ordre de fermeture à distance (KILL SWITCH)
                    if action == "KILL":
                        self.handle_remote_kill(message)
                        return

                    # 2. Traitement de l'ordre de verrouillage à distance
                    elif action == "LOCK":
                        self.handle_remote_lock(message)

                    # 3. Traitement de l'ordre de déverrouillage
                    elif action == "UNLOCK":
                        self.handle_remote_unlock()

                    self.remote_status_label.setText("Supervision à distance : Connecté")
                    self.remote_status_label.setStyleSheet("padding: 2px 8px; font-size: 11px; color: #0284C7;")
        except Exception:
            # En cas de perte de réseau temporaire, continuer normalement
            self.remote_status_label.setText("Supervision à distance : En attente")
            self.remote_status_label.setStyleSheet("padding: 2px 8px; font-size: 11px; color: #64748B;")

    def handle_remote_kill(self, reason):
        """Fermeture forcée ordonnée à distance par le manager ou admin."""
        self.remote_control_timer.stop()
        reason_text = reason or "La fermeture à distance a été ordonnée par le Manager / Administrateur."
        
        msg_box = QMessageBox(self)
        msg_box.setIcon(QMessageBox.Icon.Critical)
        msg_box.setWindowTitle("Arrêt Forcé à Distance (Killswitch)")
        msg_box.setText("<h3>FERMETURE IMMÉDIATE DU LOGICIEL</h3>")
        msg_box.setInformativeText(f"{reason_text}\n\nL'application va se fermer automatiquement.")
        msg_box.setStandardButtons(QMessageBox.StandardButton.Ok)
        msg_box.exec()

        # Quitter immédiatement le processus
        QApplication.quit()
        sys.exit(0)

    def handle_remote_lock(self, reason):
        """Verrouille l'accès au poste."""
        if not self.lock_dialog or not self.lock_dialog.isVisible():
            self.lock_dialog = LockOverlayDialog(self, reason=reason)
            self.lock_dialog.showFullScreen()

    def handle_remote_unlock(self):
        """Déverrouille l'accès au poste."""
        if self.lock_dialog and self.lock_dialog.isVisible():
            self.lock_dialog.close()
            self.lock_dialog = None
            self.status.showMessage("Poste déverrouillé à distance par le Manager.", 4000)

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
    os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = "--disable-logging --no-sandbox"
    
    app = QApplication(sys.argv)
    app.setApplicationName("Smart PME Finance")
    app.setOrganizationName("Smart PME SARL")

    target_url = os.environ.get("DESKTOP_WEB_URL", "http://localhost:5173")
    api_url = os.environ.get("DESKTOP_API_URL", "http://localhost:3001/api/v1")

    window = SmartPMEDesktop(target_url=target_url, api_url=api_url)
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()

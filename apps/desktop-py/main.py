"""
Smart PME Finance - Client Desktop Windows Natif (PyQt6)
Application Desktop professionnelle pour la gestion commerciale et financière des PME.
"""

import sys
import os
import urllib.request
import json
from PyQt6.QtCore import QUrl, Qt, QTimer
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout,
    QStatusBar, QLabel, QMenuBar, QMenu, QMessageBox
)
from PyQt6.QtGui import QAction, QKeySequence, QIcon
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile


class SmartPMEDesktop(QMainWindow):
    def __init__(self, target_url="http://localhost:5173", api_url="http://localhost:3000/api"):
        super().__init__()
        self.target_url = target_url
        self.api_url = api_url

        self.init_ui()
        self.init_menu()
        self.init_status_bar()

        # Timer pour vérifier la santé du serveur backend toutes les 15 secondes
        self.health_timer = QTimer(self)
        self.health_timer.timeout.connect(self.check_backend_health)
        self.health_timer.start(15000)
        self.check_backend_health()

    def init_ui(self):
        self.setWindowTitle("Smart PME Finance - Poste de Travail Desktop")
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

        quit_action = QAction("&Quitter", self)
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

        # Menu Outils
        tools_menu = menubar.addMenu("&Outils")

        check_api_action = QAction("Vérifier la connexion Serveur", self)
        check_api_action.triggered.connect(self.check_backend_health_manual)
        tools_menu.addAction(check_api_action)

        # Menu Aide
        help_menu = menubar.addMenu("&Aide")
        about_action = QAction("À propos de Smart PME Finance", self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)

    def init_status_bar(self):
        self.status = QStatusBar()
        self.setStatusBar(self.status)

        # Label d'état du serveur
        self.api_status_label = QLabel("Serveur API : Vérification...")
        self.api_status_label.setStyleSheet("padding: 2px 8px; font-size: 11px;")
        self.status.addPermanentWidget(self.api_status_label)

        # Label d'environnement
        env_label = QLabel("Environnement : Poste Local Windows")
        env_label.setStyleSheet("padding: 2px 8px; font-size: 11px; color: #64748B;")
        self.status.addPermanentWidget(env_label)

    def on_load_started(self):
        self.status.showMessage("Chargement en cours...", 2000)

    def on_load_finished(self, success):
        if success:
            self.status.showMessage("Application prête.", 3000)
        else:
            self.status.showMessage("Erreur de chargement de l'interface locale.", 5000)

    def print_current_page(self):
        """Déclenche le dialogue d'impression natif du système pour factures/tickets."""
        self.browser.page().printToPdf(lambda data: None)
        # Appel JavaScript pour imprimer proprement
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
                    self.api_status_label.setText("Serveur API : En ligne (Connecté)")
                    self.api_status_label.setStyleSheet("padding: 2px 8px; font-size: 11px; color: #166534; font-weight: bold;")
                else:
                    self.api_status_label.setText("Serveur API : Réponse anormale")
                    self.api_status_label.setStyleSheet("padding: 2px 8px; font-size: 11px; color: #B45309;")
        except Exception:
            self.api_status_label.setText("Serveur API : Déconnecté (Mode Hors-Ligne)")
            self.api_status_label.setStyleSheet("padding: 2px 8px; font-size: 11px; color: #991B1B; font-weight: bold;")

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
            "<p><b>Version :</b> 1.0.0 (Production Desktop)</p>"
            "<p>Plateforme intégrée de gestion commerciale et financière pour PME.</p>"
            "<p>Développé avec PyQt6 (moteur Qt WebEngine natif Windows) et API NestJS / PostgreSQL.</p>"
            "<p>Conforme aux normes OHADA et réalités économiques de la RDC (CDF / USD).</p>"
        )


def main():
    # Optimisations graphiques Qt
    os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = "--disable-logging --no-sandbox"
    
    app = QApplication(sys.argv)
    app.setApplicationName("Smart PME Finance")
    app.setOrganizationName("Smart PME SARL")

    target_url = os.environ.get("DESKTOP_WEB_URL", "http://localhost:5173")
    api_url = os.environ.get("DESKTOP_API_URL", "http://localhost:3000/api")

    window = SmartPMEDesktop(target_url=target_url, api_url=api_url)
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()

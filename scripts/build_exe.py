"""
Script de compilation de l'exécutable autonome Windows pour Smart PME Finance.
Génère SmartPME_Finance.exe prêt pour le déploiement sur les postes de travail.
"""

import os
import sys
import subprocess
import shutil

def build_windows_exe():
    print("=" * 60)
    print("  Smart PME Finance - Compilation de l'Exécutable Windows")
    print("=" * 60)

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    main_script = os.path.join(base_dir, "apps", "desktop-py", "main.py")
    web_dist = os.path.join(base_dir, "apps", "web", "dist")
    dist_dir = os.path.join(base_dir, "dist_desktop")
    build_dir = os.path.join(base_dir, "build_desktop")

    if not os.path.exists(main_script):
        print(f"[ERREUR] Script introuvable : {main_script}")
        return False

    npm_command = shutil.which("npm.cmd") or shutil.which("npm")
    if not npm_command:
        print("[ERREUR] npm est introuvable. Installez Node.js puis réessayez.")
        return False

    print("\nCompilation de l'interface Web embarquée...")
    web_build = subprocess.run(
        f'call "{npm_command}" run build:web',
        cwd=base_dir,
        shell=True,
    )
    if web_build.returncode != 0:
        print("\n[ERREUR] Échec de la compilation de l'interface Web.")
        return False

    if not os.path.isfile(os.path.join(web_dist, "index.html")):
        print(f"[ERREUR] Interface Web générée introuvable : {web_dist}")
        return False

    # Commande PyInstaller optimisée
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--onedir",
        "--windowed",
        "--name=SmartPME_Finance",
        f"--distpath={dist_dir}",
        f"--workpath={build_dir}",
        "--collect-all=PyQt6",
        "--collect-all=PyQt6.QtWebEngineWidgets",
        "--collect-all=PyQt6.QtWebEngineCore",
        f"--add-data={web_dist};web-dist",
        main_script,
    ]

    print(f"\nExécution de la commande :\n{' '.join(cmd)}\n")
    result = subprocess.run(cmd)

    if result.returncode == 0:
        exe_path = os.path.join(dist_dir, "SmartPME_Finance", "SmartPME_Finance.exe")
        print("\n" + "=" * 60)
        print("  [SUCCÈS] Exécutable Windows généré avec succès !")
        print(f"  Emplacement : {exe_path}")
        print("=" * 60 + "\n")
        return True
    else:
        print("\n[ERREUR] Échec de la compilation PyInstaller.")
        return False

if __name__ == "__main__":
    success = build_windows_exe()
    sys.exit(0 if success else 1)

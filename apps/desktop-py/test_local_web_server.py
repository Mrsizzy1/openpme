import tempfile
import threading
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen

from local_web_server import create_web_server


class LocalWebServerTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.web_root = Path(self.temporary_directory.name)
        (self.web_root / "index.html").write_text(
            '<html><script src="/desktop-config.js"></script></html>',
            encoding="utf-8",
        )
        (self.web_root / "assets").mkdir()
        (self.web_root / "assets" / "app.js").write_text("ready", encoding="utf-8")
        self.server = create_web_server(self.web_root, "https://api.example.test/api/v1", port=0)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.temporary_directory.cleanup()

    def test_serves_the_application_shell_for_deep_links(self):
        with urlopen(f"{self.server.base_url}/sales?posMode=cashier") as response:
            self.assertEqual(response.status, 200)
            self.assertIn(b"desktop-config.js", response.read())

    def test_serves_runtime_desktop_and_api_configuration(self):
        with urlopen(f"{self.server.base_url}/desktop-config.js") as response:
            config = response.read().decode("utf-8")
        self.assertIn('"desktop":true', config)
        self.assertIn('"apiBaseUrl":"https://api.example.test/api/v1"', config)

    def test_does_not_replace_missing_static_assets_with_the_shell(self):
        try:
            urlopen(f"{self.server.base_url}/assets/missing.js")
        except HTTPError as error:
            self.assertEqual(error.code, 404)
            error.close()
        else:
            self.fail("A missing JavaScript asset must return 404.")


if __name__ == "__main__":
    unittest.main()

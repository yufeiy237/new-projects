import functools
import http.server
import os
import threading
import webbrowser
from pathlib import Path

root = Path(__file__).resolve().parent
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
url = f'http://127.0.0.1:{server.server_port}/Contribution.html'
print('Website preview: ' + url)
print('Keep this window open. Close it to stop the preview.')
threading.Timer(0.8, lambda: webbrowser.open(url)).start()
server.serve_forever()

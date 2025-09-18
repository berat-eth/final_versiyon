#!/usr/bin/env python3
"""
Simple HTTP server for Huglu Outdoor Admin Panel
"""

import http.server
import socketserver
import os
import webbrowser
from threading import Timer

PORT = 8080

class AdminPanelHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.realpath(__file__)), **kwargs)
    
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key, Authorization')
        super().end_headers()

def open_browser():
    webbrowser.open(f'http://localhost:{PORT}')

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), AdminPanelHandler) as httpd:
        print(f"🚀 Huglu Outdoor Admin Panel")
        print(f"📱 Server running at: http://localhost:{PORT}")
        print(f"🔑 Admin Key: huglu-admin-2024-secure-key")
        print(f"🌐 Backend API: http://213.142.159.135:3000/api")
        print(f"🔧 Admin Panel: http://localhost:{PORT}")
        print(f"⚠️  Make sure your backend server is running on remote server")
        print(f"🌐 Opening browser in 2 seconds...")
        
        # Open browser after 2 seconds
        Timer(2.0, open_browser).start()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Admin panel stopped.")
            httpd.shutdown()

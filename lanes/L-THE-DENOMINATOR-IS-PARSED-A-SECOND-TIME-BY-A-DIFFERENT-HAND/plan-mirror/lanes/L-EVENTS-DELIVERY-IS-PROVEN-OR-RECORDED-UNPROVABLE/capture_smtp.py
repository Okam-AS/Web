"""A loopback implicit-TLS SMTP sink that captures whatever is posted to it and delivers nothing.

Stdlib only. It exists to answer one question: with the product's exact MailKit call sequence, can a
message be handed to an SMTP server on this machine at all? Every message it receives is written to
captured/ and goes no further -- there is no relay, no upstream, and the listener is bound to 127.0.0.1.

AUTH is advertised because MailKit's transport calls AuthenticateAsync unconditionally; any label is
accepted and none is written down, so no credential is involved on either side.
"""
import os
import socket
import ssl
import sys
import threading
import time

HOST = "127.0.0.1"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 14650
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "captured")
os.makedirs(OUT, exist_ok=True)

EHLO_LINES = [
    "250-capture.localhost",
    "250-SIZE 33554432",
    "250-8BITMIME",
    "250-AUTH PLAIN",
    "250 HELP",
]


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def handle(conn, addr):
    f = conn.makefile("rwb")

    def send(line):
        f.write((line + "\r\n").encode())
        f.flush()

    def read():
        raw = f.readline()
        if not raw:
            return None
        return raw.decode("utf-8", "replace").rstrip("\r\n")

    send("220 capture.localhost ESMTP capture-sink")
    envelope = {"from": None, "rcpt": []}
    while True:
        line = read()
        if line is None:
            break
        verb = line.split(" ")[0].upper()
        if verb in ("EHLO", "HELO"):
            if verb == "HELO":
                send("250 capture.localhost")
            else:
                for l in EHLO_LINES:
                    send(l)
        elif verb == "AUTH":
            # Any label is accepted and none is recorded.
            if len(line.split(" ")) == 2:
                send("334 ")
                read()
            send("235 2.7.0 Authentication successful")
            log("AUTH accepted (label discarded)")
        elif verb == "MAIL":
            envelope["from"] = line
            send("250 2.1.0 Ok")
        elif verb == "RCPT":
            envelope["rcpt"].append(line)
            send("250 2.1.5 Ok")
        elif verb == "DATA":
            send("354 End data with <CR><LF>.<CR><LF>")
            chunks = []
            while True:
                raw = f.readline()
                if not raw:
                    break
                if raw in (b".\r\n", b".\n"):
                    break
                if raw.startswith(b".."):
                    raw = raw[1:]
                chunks.append(raw)
            body = b"".join(chunks)
            name = os.path.join(OUT, "message-%d.eml" % int(time.time() * 1000))
            with open(name, "wb") as fh:
                fh.write(body)
            log("CAPTURED %d bytes -> %s" % (len(body), os.path.basename(name)))
            send("250 2.0.0 Ok: captured, not delivered")
            envelope = {"from": None, "rcpt": []}
        elif verb == "RSET":
            envelope = {"from": None, "rcpt": []}
            send("250 2.0.0 Ok")
        elif verb == "NOOP":
            send("250 2.0.0 Ok")
        elif verb == "QUIT":
            send("221 2.0.0 Bye")
            break
        else:
            send("502 5.5.2 Command not implemented")
    try:
        f.close()
        conn.close()
    except Exception:
        pass


def main():
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(os.path.join(HERE, "cert.pem"), os.path.join(HERE, "key.pem"))
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((HOST, PORT))
    srv.listen(8)
    log("capture sink listening on %s:%d pid=%d" % (HOST, PORT, os.getpid()))
    while True:
        try:
            raw, addr = srv.accept()
        except OSError:
            break
        try:
            conn = ctx.wrap_socket(raw, server_side=True)
        except Exception as e:
            log("TLS handshake refused by client: %s: %s" % (type(e).__name__, e))
            try:
                raw.close()
            except Exception:
                pass
            continue
        threading.Thread(target=handle, args=(conn, addr), daemon=True).start()


if __name__ == "__main__":
    main()

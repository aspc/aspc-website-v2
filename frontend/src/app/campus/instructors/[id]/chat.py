"""
Project 1

Joey Lim, Ella Zhu, Haram Yoon
"""

import socket
import threading
import sys
import json

class ChatPeer:
    def __init__(self, port):
        self.port = port
        self.connections = {} 
        self.connection_counter = 0
        self.connection_lock = threading.Lock()
        self.running = True
        self.server_socket = None
        self.my_ip = self._get_actual_ip()
        
    def _get_actual_ip(self):
        try:
            # create a socket connection to an external address to determine local IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            try:
                hostname = socket.gethostname()
                ip = socket.gethostbyname(hostname)
                if ip != "127.0.0.1":
                    return ip
            except Exception:
                pass
            return "Unable to determine IP"
    
    def start_server(self):
        try:
            self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server_socket.bind(('', self.port))
            self.server_socket.listen(5)
            
            # start server thread
            server_thread = threading.Thread(target=self._accept_connections, daemon=True)
            server_thread.start()
            
            print(f"Chat application started on port {self.port}")
            print(f"My IP: {self.my_ip}")
            print("Type 'help' for available commands\n")
            
        except Exception as e:
            print(f"Error starting server: {e}")
            sys.exit(1)
    
    def _accept_connections(self):
        while self.running:
            try:
                client_socket, address = self.server_socket.accept()
                
                # ensure no timeout on accepted socket
                client_socket.settimeout(None)
                
                # check for duplicate connections
                if self._is_duplicate_connection(address[0], None):
                    client_socket.send(json.dumps({
                        'type': 'error',
                        'message': 'Duplicate connection rejected'
                    }).encode())
                    client_socket.close()
                    continue
                
                # add connection
                with self.connection_lock:
                    self.connection_counter += 1
                    conn_id = self.connection_counter
                    
                    # receive peer's listening port
                    try:
                        data = client_socket.recv(1024).decode()
                        peer_info = json.loads(data)
                        peer_port = peer_info.get('port', address[1])
                    except:
                        peer_port = address[1]
                    
                    self.connections[conn_id] = {
                        'socket': client_socket,
                        'ip': address[0],
                        'port': peer_port,
                        'type': 'incoming'
                    }
                
                print(f"\n[New connection] {address[0]}:{peer_port} (ID: {conn_id})")
                print(">>> ", end="", flush=True)
                
                # start handler thread for this connection
                handler_thread = threading.Thread(
                    target=self._handle_connection,
                    args=(conn_id,),
                    daemon=True
                )
                handler_thread.start()
                
            except Exception as e:
                if self.running:
                    print(f"Error accepting connection: {e}")
    
    def _handle_connection(self, conn_id):
        while self.running and conn_id in self.connections:
            try:
                conn = self.connections[conn_id]
                data = conn['socket'].recv(4096)
                
                if not data:
                    # connection closed by peer
                    break
                
                message = json.loads(data.decode())
                
                if message['type'] == 'chat':
                    print(f"\nMessage received from {conn['ip']}")
                    print(f"Sender's Port: {conn['port']}")
                    print(f"Message: \"{message['content']}\"")
                    print(">>> ", end="", flush=True)
                    
                elif message['type'] == 'disconnect':
                    print(f"\n[Connection closed] {conn['ip']}:{conn['port']} has disconnected")
                    print(">>> ", end="", flush=True)
                    break
                    
            except socket.timeout:
                continue
            except json.JSONDecodeError:
                continue
            except Exception as e:
                break
        
        # remove connection
        self._remove_connection(conn_id)
    
    # check if a connection to this IP already exists
    def _is_duplicate_connection(self, ip, port):
        with self.connection_lock:
            for conn in self.connections.values():
                if conn['ip'] == ip:
                    if port is None or conn['port'] == port:
                        return True
        return False
    
    def _remove_connection(self, conn_id):
        with self.connection_lock:
            if conn_id in self.connections:
                try:
                    self.connections[conn_id]['socket'].close()
                except:
                    pass
                del self.connections[conn_id]
    
    def cmd_help(self):
        help_text = """
Available Commands:
==================
help                                  - display this help information
myip                                  - display the IP address of this process
myport                                - display the port this process is listening on
connect <destination> <port>          - connect to a peer at the specified IP and port
list                                  - list all active connections
terminate <connection id>             - terminate the specified connection
send <connection id> <message>        - send a message to the specified connection
exit                                  - close all connections and exit the application
"""
        print(help_text)
    
    def cmd_myip(self):
        #display the IP address of this machine
        print(f"My IP: {self.my_ip}")
    
    def cmd_myport(self):
        #display the listening port
        print(f"My Port: {self.port}")
    
    def cmd_connect(self, args):
        if len(args) != 2:
            print("Error: Usage - connect <destination> <port>")
            return
        
        destination = args[0]
        try:
            port = int(args[1])
        except ValueError:
            print("Error: Port must be a valid number")
            return
        
        # check for self-connection
        if destination == self.my_ip and port == self.port:
            print("Error: Cannot connect to yourself")
            return
        
        # check connection limit (max 3 peers)
        with self.connection_lock:
            if len(self.connections) >= 3:
                print("Error: Maximum of 3 connections allowed")
                return
        
        # check for duplicate connection
        if self._is_duplicate_connection(destination, port):
            print(f"Error: Already connected to {destination}:{port}")
            return
        
        # attempt connection
        try:
            print(f"Attempting to connect to {destination}:{port}...")
            client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            client_socket.settimeout(10)
            client_socket.connect((destination, port))
            
            # remove timeout after successful connection
            client_socket.settimeout(None)
            
            # send our listening port to the peer
            client_socket.send(json.dumps({'port': self.port}).encode())
            
            # add connection
            with self.connection_lock:
                self.connection_counter += 1
                conn_id = self.connection_counter
                self.connections[conn_id] = {
                    'socket': client_socket,
                    'ip': destination,
                    'port': port,
                    'type': 'outgoing'
                }
            
            print(f"Successfully connected to {destination}:{port} (ID: {conn_id})")
            
            # start handler thread
            handler_thread = threading.Thread(
                target=self._handle_connection,
                args=(conn_id,),
                daemon=True
            )
            handler_thread.start()
            
        except socket.timeout:
            print(f"Error: Connection to {destination}:{port} timed out")
            print(f"Possible issues:")
            print(f"  - Peer is not running on {destination}:{port}")
            print(f"  - Firewall is blocking the connection")
            print(f"  - Machines are not on the same network")
        except ConnectionRefusedError:
            print(f"Error: Connection refused by {destination}:{port}")
            print(f"  - Is the peer running? Try: python3 chat.py {port}")
            print(f"  - Check the port number is correct")
        except socket.gaierror:
            print(f"Error: Could not resolve address {destination}")
            print(f"  - Check the IP address is correct")
        except socket.error as e:
            print(f"Error: Unable to connect to {destination}:{port}")
            print(f"  - Details: {e}")
            print(f"  - Try: ping {destination}")
        except Exception as e:
            print(f"Error: Connection failed - {e}")
    
    def cmd_list(self):
        with self.connection_lock:
            if not self.connections:
                print("No active connections")
                return
            
            print("\nid: IP address          Port No.")
            print("=" * 40)
            for conn_id, conn in sorted(self.connections.items()):
                print(f"{conn_id:2}: {conn['ip']:<20} {conn['port']}")
            print()
    
    def cmd_terminate(self, args):
        if len(args) != 1:
            print("Error: Usage - terminate <connection id>")
            return
        
        try:
            conn_id = int(args[0])
        except ValueError:
            print("Error: Connection ID must be a number")
            return
        
        with self.connection_lock:
            if conn_id not in self.connections:
                print(f"Error: Connection {conn_id} does not exist")
                return
            
            conn = self.connections[conn_id]
            
            # send disconnect notification
            try:
                conn['socket'].send(json.dumps({
                    'type': 'disconnect'
                }).encode())
            except:
                pass

            print(f"Connection {conn_id} ({conn['ip']}:{conn['port']}) terminated")
        self._remove_connection(conn_id)
    
    def cmd_send(self, args):
        if len(args) < 2:
            print("Error: Usage - send <connection id> <message>")
            return
        try:
            conn_id = int(args[0])
        except ValueError:
            print("Error: Connection ID must be a number")
            return
        
        message = ' '.join(args[1:])
        
        if len(message) > 100:
            print("Error: Message cannot exceed 100 characters")
            return
        
        with self.connection_lock:
            if conn_id not in self.connections:
                print(f"Error: Connection {conn_id} does not exist")
                return
            
            conn = self.connections[conn_id]
        
        try:
            conn['socket'].send(json.dumps({
                'type': 'chat',
                'content': message
            }).encode())
            print(f"Message sent to {conn_id}")

        except Exception as e:
            print(f"Error: Failed to send message - {e}")
            self._remove_connection(conn_id)
    
    # exit the application and close all connections
    def cmd_exit(self):
        print("Closing all connections...")
        
        # send disconnect notification to all peers
        with self.connection_lock:
            for conn in self.connections.values():
                try:
                    conn['socket'].send(json.dumps({
                        'type': 'disconnect'
                    }).encode())
                    conn['socket'].close()
                except:
                    pass
        
        self.running = False
        
        # close server socket
        if self.server_socket:
            try:
                self.server_socket.close()
            except:
                pass
        
        print("Goodbye!")
        sys.exit(0)
    
    def run_shell(self):
        """
        run the command shell interface.
        """
        while self.running:
            try:
                command = input(">>> ").strip()
                
                if not command:
                    continue
                
                parts = command.split()
                cmd = parts[0].lower()
                args = parts[1:]
                
                if cmd == "help":
                    self.cmd_help()
                elif cmd == "myip":
                    self.cmd_myip()
                elif cmd == "myport":
                    self.cmd_myport()
                elif cmd == "connect":
                    self.cmd_connect(args)
                elif cmd == "list":
                    self.cmd_list()
                elif cmd == "terminate":
                    self.cmd_terminate(args)
                elif cmd == "send":
                    self.cmd_send(args)
                elif cmd == "exit":
                    self.cmd_exit()
                else:
                    print(f"Unknown command: {cmd}. Type 'help' for available commands.")
                    
            except KeyboardInterrupt:
                print("\nUse 'exit' command to quit")
            except Exception as e:
                print(f"Error: {e}")


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 chat.py <port>")
        print("Example: python3 chat.py 4545")
        sys.exit(1)
    
    try:
        port = int(sys.argv[1])
        if port < 1024 or port > 65535:
            print("Error: Port number must be between 1024 and 65535")
            sys.exit(1)
    except ValueError:
        print("Error: Port must be a valid number")
        sys.exit(1)
    
    # create and start the chat peer
    peer = ChatPeer(port)
    peer.start_server()
    peer.run_shell()


if __name__ == "__main__":
    main()
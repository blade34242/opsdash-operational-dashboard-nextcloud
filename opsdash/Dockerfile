FROM kalilinux/kali-rolling:latest

# Fix Kali repositories and update
RUN echo "deb http://http.kali.org/kali kali-rolling main contrib non-free non-free-firmware" > /etc/apt/sources.list && \
    echo "deb-src http://http.kali.org/kali kali-rolling main contrib non-free non-free-firmware" >> /etc/apt/sources.list

# Update and install essential packages
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    curl \
    wget \
    vim \
    sudo \
    ssh \
    net-tools \
    iputils-ping \
    nmap \
    nikto \
    sqlmap \
    metasploit-framework \
    john \
    hashcat \
    aircrack-ng \
    wireshark \
    burpsuite \
    gobuster \
    dirb \
    hydra \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /app

# Create the MCP server script directly in the container
RUN cat > /app/mcp_server.py << 'EOF'
#!/usr/bin/env python3
import asyncio
import json
import subprocess
import logging
import sys
import os
from typing import Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KaliMCPServer:
    def __init__(self):
        self.tools = {
            'nmap_scan': self.nmap_scan,
            'execute_command': self.execute_command,
            'nikto_scan': self.nikto_scan,
            'sqlmap_scan': self.sqlmap_scan,
            'gobuster_scan': self.gobuster_scan,
            'network_info': self.network_info,
            'port_scan': self.port_scan,
            'vulnerability_scan': self.vulnerability_scan
        }

    async def execute_command(self, command: str, timeout: int = 60) -> Dict[str, Any]:
        try:
            logger.info(f"Executing command: {command}")
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
            return {
                'success': True,
                'stdout': stdout.decode('utf-8', errors='ignore'),
                'stderr': stderr.decode('utf-8', errors='ignore'),
                'return_code': process.returncode
            }
        except Exception as e:
            logger.error(f"Error executing command: {str(e)}")
            return {'success': False, 'error': str(e), 'stdout': '', 'stderr': ''}

    async def nmap_scan(self, target: str, scan_type: str = 'basic') -> Dict[str, Any]:
        commands = {
            'basic': f'nmap {target}',
            'syn': f'nmap -sS {target}',
            'version': f'nmap -sV {target}',
            'os': f'nmap -O {target}',
            'aggressive': f'nmap -A {target}'
        }
        command = commands.get(scan_type, commands['basic'])
        return await self.execute_command(command, timeout=300)

    async def nikto_scan(self, target: str) -> Dict[str, Any]:
        command = f'nikto -h {target}'
        return await self.execute_command(command, timeout=600)

    async def sqlmap_scan(self, url: str, additional_params: str = '') -> Dict[str, Any]:
        command = f'sqlmap -u "{url}" --batch {additional_params}'
        return await self.execute_command(command, timeout=300)

    async def gobuster_scan(self, url: str, wordlist: str = '/usr/share/wordlists/dirb/common.txt') -> Dict[str, Any]:
        command = f'gobuster dir -u {url} -w {wordlist} -q'
        return await self.execute_command(command, timeout=300)

    async def network_info(self) -> Dict[str, Any]:
        command = 'ip addr show && echo "=== ROUTING ===" && ip route show'
        return await self.execute_command(command)

    async def port_scan(self, target: str, ports: str = '1-1000') -> Dict[str, Any]:
        command = f'nmap -p {ports} --open {target}'
        return await self.execute_command(command, timeout=120)

    async def vulnerability_scan(self, target: str) -> Dict[str, Any]:
        command = f'nmap --script vuln {target}'
        return await self.execute_command(command, timeout=300)

    def run_stdio(self):
        logger.info("Starting MCP server in stdio mode")
        
        while True:
            try:
                line = sys.stdin.readline()
                if not line:
                    break
                    
                line = line.strip()
                if not line:
                    continue
                
                request = json.loads(line)
                logger.info(f"Received MCP request: {request}")
                
                if request.get('method') == 'initialize':
                    response = {
                        'jsonrpc': '2.0',
                        'id': request.get('id'),
                        'result': {
                            'protocolVersion': '2025-06-18',
                            'capabilities': {
                                'tools': {
                                    'listChanged': True
                                }
                            },
                            'serverInfo': {'name': 'kali-mcp-server', 'version': '1.0.0'}
                        }
                    }
                
                elif request.get('method') == 'notifications/initialized':
                    continue  # No response needed for notifications
                
                elif request.get('method') == 'tools/list':
                    response = {
                        'jsonrpc': '2.0',
                        'id': request.get('id'),
                        'result': {
                            'tools': [
                                {
                                    'name': 'nmap_scan',
                                    'description': 'Network discovery and security auditing',
                                    'inputSchema': {
                                        'type': 'object',
                                        'properties': {
                                            'target': {'type': 'string', 'description': 'Target IP or domain'},
                                            'scan_type': {'type': 'string', 'description': 'Scan type: basic, syn, version, os, aggressive', 'default': 'basic'}
                                        },
                                        'required': ['target']
                                    }
                                },
                                {
                                    'name': 'execute_command',
                                    'description': 'Execute custom shell commands',
                                    'inputSchema': {
                                        'type': 'object',
                                        'properties': {
                                            'command': {'type': 'string', 'description': 'Shell command to execute'}
                                        },
                                        'required': ['command']
                                    }
                                },
                                {
                                    'name': 'nikto_scan',
                                    'description': 'Web server vulnerability scanner',
                                    'inputSchema': {
                                        'type': 'object',
                                        'properties': {
                                            'target': {'type': 'string', 'description': 'Target URL or IP'}
                                        },
                                        'required': ['target']
                                    }
                                },
                                {
                                    'name': 'sqlmap_scan',
                                    'description': 'SQL injection testing tool',
                                    'inputSchema': {
                                        'type': 'object',
                                        'properties': {
                                            'url': {'type': 'string', 'description': 'Target URL to test'},
                                            'additional_params': {'type': 'string', 'description': 'Additional SQLMap parameters', 'default': ''}
                                        },
                                        'required': ['url']
                                    }
                                },
                                {
                                    'name': 'gobuster_scan',
                                    'description': 'Directory and file enumeration',
                                    'inputSchema': {
                                        'type': 'object',
                                        'properties': {
                                            'url': {'type': 'string', 'description': 'Target URL'},
                                            'wordlist': {'type': 'string', 'description': 'Wordlist path', 'default': '/usr/share/wordlists/dirb/common.txt'}
                                        },
                                        'required': ['url']
                                    }
                                },
                                {
                                    'name': 'network_info',
                                    'description': 'Get network interface information',
                                    'inputSchema': {
                                        'type': 'object',
                                        'properties': {}
                                    }
                                },
                                {
                                    'name': 'port_scan',
                                    'description': 'Quick port scanning',
                                    'inputSchema': {
                                        'type': 'object',
                                        'properties': {
                                            'target': {'type': 'string', 'description': 'Target IP or domain'},
                                            'ports': {'type': 'string', 'description': 'Port range (e.g., 1-1000)', 'default': '1-1000'}
                                        },
                                        'required': ['target']
                                    }
                                },
                                {
                                    'name': 'vulnerability_scan',
                                    'description': 'Basic vulnerability assessment',
                                    'inputSchema': {
                                        'type': 'object',
                                        'properties': {
                                            'target': {'type': 'string', 'description': 'Target IP or domain'}
                                        },
                                        'required': ['target']
                                    }
                                }
                            ]
                        }
                    }
                
                elif request.get('method') == 'tools/call':
                    tool_name = request['params']['name']
                    arguments = request['params'].get('arguments', {})
                    
                    if tool_name in self.tools:
                        # Run synchronously for stdio mode
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        try:
                            result = loop.run_until_complete(self.tools[tool_name](**arguments))
                        finally:
                            loop.close()
                        
                        response = {
                            'jsonrpc': '2.0',
                            'id': request.get('id'),
                            'result': {
                                'content': [{
                                    'type': 'text',
                                    'text': f"Tool: {tool_name}\nSuccess: {result.get('success')}\n\nOutput:\n{result.get('stdout', '')}\n\nErrors:\n{result.get('stderr', '')}\n\nError: {result.get('error', 'None')}"
                                }]
                            }
                        }
                    else:
                        response = {
                            'jsonrpc': '2.0',
                            'id': request.get('id'),
                            'error': {'code': -32601, 'message': f'Tool not found: {tool_name}'}
                        }
                
                else:
                    response = {
                        'jsonrpc': '2.0',
                        'id': request.get('id'),
                        'result': {'content': [{'type': 'text', 'text': 'Kali MCP Server ready'}]}
                    }
                
                print(json.dumps(response), flush=True)
                
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {e}")
                continue
            except KeyboardInterrupt:
                break
            except Exception as e:
                logger.error(f"Error: {e}")
                error_response = {
                    'jsonrpc': '2.0',
                    'id': 1,
                    'error': {'code': -32603, 'message': str(e)}
                }
                print(json.dumps(error_response), flush=True)

if __name__ == "__main__":
    server = KaliMCPServer()
    if len(sys.argv) > 1 and sys.argv[1] == '--stdio':
        server.run_stdio()
    else:
        print("Use --stdio flag for MCP mode")
EOF

# Make the script executable
RUN chmod +x /app/mcp_server.py

# Install Python dependencies
RUN pip3 install --no-cache-dir --break-system-packages \
    requests \
    beautifulsoup4 \
    scapy

# Create a non-root user for security
RUN useradd -m -s /bin/bash kaliuser && \
    echo 'kaliuser:kali' | chpasswd && \
    usermod -aG sudo kaliuser

# Fix file permissions AFTER copying files  
RUN chown -R kaliuser:kaliuser /app

# Expose the MCP server port
EXPOSE 3000

# Stay as root for services and file access
USER root

# Initialize services and start the MCP server
CMD service postgresql start 2>/dev/null || true && \
    msfdb init 2>/dev/null || true && \
    updatedb 2>/dev/null || true && \
    cd /app && \
    python3 mcp_server.py --stdio

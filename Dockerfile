# Stabiler Basis-Snapshot (Image-Tag bleibt ok)
FROM kalilinux/kali-last-release

ENV DEBIAN_FRONTEND=noninteractive TZ=UTC

# APT robust + richtige Branch (kali-last-snapshot), erst HTTP, dann ca-certs
RUN printf 'Acquire::ForceIPv4 "true";\nAcquire::Retries "5";\n' > /etc/apt/apt.conf.d/99network \
 && echo 'deb http://http.kali.org/kali kali-last-snapshot main contrib non-free non-free-firmware' > /etc/apt/sources.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl iproute2 procps jq \
 && update-ca-certificates \
 && apt-get install -y --no-install-recommends \
      nmap gobuster dirb nikto python3-mcp mcp-kali-server \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

EXPOSE 5000
CMD ["/usr/bin/kali-server-mcp","--host","0.0.0.0","--port","5000"]


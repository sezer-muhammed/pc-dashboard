# Full XFCE desktop on Neko's NVIDIA base => GPU NVENC encoding + a real desktop.
# XFCE renders into the X11 framebuffer, so ximagesrc captures it reliably
# (unlike GPU-Chromium's EGL surface, which captured black).
ARG BASE_IMAGE=ghcr.io/m1k1o/neko/nvidia-base:latest
FROM $BASE_IMAGE

RUN set -eux; apt-get update; \
    apt-get install -y --no-install-recommends \
      xfce4 xfce4-terminal dbus-x11 sudo \
      fonts-noto-core; \
    # neko user can sudo (install apps inside the desktop)
    usermod -aG sudo neko; \
    echo "neko:neko" | chpasswd; \
    echo "%sudo ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers; \
    apt-get clean -y; \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/*

# tell neko's supervisor to launch the XFCE session
COPY supervisord.conf /etc/neko/supervisord/xfce.conf

# perf: ship a default config that turns OFF the xfwm4 compositor (less lag,
# cleaner capture). Applied to the neko user's profile.
COPY xfwm4.xml /home/neko/.config/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml
RUN chown -R neko:neko /home/neko/.config

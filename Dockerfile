From ubuntu:16.04

RUN apt-get update && apt-get install -y \
bzip2 \
libfontconfig1

ADD https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-2.1.1-linux-x86_64.tar.bz2 /webfingerprint/
RUN tar jxvf /webfingerprint/phantomjs-2.1.1-linux-x86_64.tar.bz2 -C /webfingerprint/
ADD web-fingerprint.js /webfingerprint/
ADD md5.js /webfingerprint/

VOLUME ["/webfingerprint/data"]

ENTRYPOINT ["webfingerprint/phantomjs-2.1.1-linux-x86_64/bin/phantomjs", "/webfingerprint/web-fingerprint.js"]
#ENTRYPOINT ["/bin/bash"]
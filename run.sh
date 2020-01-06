#!/bin/zsh
set -e

timeout=$1
shift

code=$(gtimeout -sKILL $timeout $@)
echo -n 'status: '
if [ -z "$code" ]; then
    echo timeout
else
    echo exited: $code
fi

#!/bin/zsh

set -e
trap "mv log completed" 0

pushd `dirname $0`

exec 1> 'log'
exec 2> 'errors'

echo $(swift --version) > 'version'

plutil -replace 'CFBundleIdentifier' -string "com.kishikawakatsumi.preview.$APP_ID" Info.plist

make simulator
make install
make launch

make simulator
make install

make launch
make uninstall

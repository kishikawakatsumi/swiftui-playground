#!/bin/zsh

set -e
trap "mv log completed" 0

pushd `dirname $0`

exec 1> 'log'
exec 2> 'errors'

echo $(swift --version) > 'version'

swift usercode.swift

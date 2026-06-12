#!/bin/zsh

cd "${0:A:h}"
(sleep 1; open "http://127.0.0.1:4317") &
exec npm start

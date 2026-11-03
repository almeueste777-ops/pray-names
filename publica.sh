#!/bin/sh
# Publicarea pe GitHub + Pages (o singura data). Ruleaza cu: ! sh /c/dev/pray-names/publica.sh
cd /c/dev/pray-names || exit 1
gh repo create pray-names --public --source . --push --description "Pomelnice scrise de mana -> foi A6 de tipar (PWA)"
gh api -X POST repos/almeueste777-ops/pray-names/pages -f build_type=legacy -f "source[branch]=main" -f "source[path]=/"
echo "Gata. Adresa: https://almeueste777-ops.github.io/pray-names/"

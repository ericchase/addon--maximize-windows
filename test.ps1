while ($true) {
    cls
    Remove-Item -Path .\tests-coverage -Recurse
    deno test --coverage=tests-coverage
    pause
}

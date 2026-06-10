module github.com/JustinZeus/spreadlab

go 1.26.3

// Keep Go tooling out of the frontend's dependency tree; some npm packages
// ship stray .go files that ./... would otherwise pick up.
ignore ./web/node_modules

tool github.com/gzuidhof/tygo

require (
	github.com/fatih/structtag v1.2.0 // indirect
	github.com/gzuidhof/tygo v0.2.21 // indirect
	github.com/inconshreveable/mousetrap v1.0.0 // indirect
	github.com/spf13/cobra v1.3.0 // indirect
	github.com/spf13/pflag v1.0.5 // indirect
	golang.org/x/mod v0.5.1 // indirect
	golang.org/x/sys v0.1.0 // indirect
	golang.org/x/tools v0.1.9 // indirect
	golang.org/x/xerrors v0.0.0-20200804184101-5ec99f83aff1 // indirect
	gopkg.in/yaml.v2 v2.4.0 // indirect
)

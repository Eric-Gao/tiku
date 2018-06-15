package main

import (
	"github.com/astaxie/beego"
	_ "github.com/tuku/routers"
	_ "github.com/tuku/sysinit"
)

func main() {
	beego.Run()
}

package sysinit

import (
	"github.com/astaxie/beego"
)

func init() {
	beego.BConfig.WebConfig.Session.SessionOn = true
	InitDatabase()
}

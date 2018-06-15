package controllers

import (
	"strings"

	"github.com/astaxie/beego"
	"github.com/tuku/enums"
	"github.com/tuku/models"
)

type BaseController struct {
	beego.Controller
	controllerName string
	actionName     string
}

//获取当前控制器名称及action名称
func (c *BaseController) Prepare() {
	c.controllerName, c.actionName = c.GetControllerAndAction()
}

func (c *BaseController) setTpl(template ...string) {
	var tplName string
	layout := "shared/layout_page.html"
	switch {
	case len(template) == 1:
		tplName = template[0]
	case len(template) == 2:
		tplName = template[0]
		layout = template[1]
	default:
		ctrlName := strings.ToLower(c.controllerName[0 : len(c.controllerName)-10])
		actionName := strings.ToLower(c.actionName)
		tplName = ctrlName + "/" + actionName + ".html"
	}
	c.Layout = layout
	c.TplName = tplName
}

func (c *BaseController) jsonResult(code enums.JsonResultCode, msg string, obj interface{}) {
	r := &models.JsonResult{code, msg, obj}
	c.Data["json"] = r
	c.ServeJSON()
	c.StopRun()
}

package controllers

import (
	"encoding/json"

	"github.com/tuku/models"
)

type QuestionTemplateController struct {
	BaseController
}

//列表页
func (c *QuestionTemplateController) Index() {
	//菜单项
	c.Data["activeSidebarUrl"] = c.URLFor(c.controllerName + "." + c.actionName)
	c.setTpl()
	c.LayoutSections = make(map[string]string)
	c.LayoutSections["headcssjs"] = "questiontemplate/index_headcssjs.html"
	c.LayoutSections["footerjs"] = "questiontemplate/index_footerjs.html"
}

func (c *QuestionTemplateController) DataGrid() {
	var params models.QuestionTemplateQueryParam
	json.Unmarshal(c.Ctx.Input.RequestBody, &params)
	data, total := models.QuestionTemplatePageList(&params)
	//定义返回的数据结构
	result := make(map[string]interface{})
	result["total"] = total
	result["rows"] = data
	c.Data["json"] = result
	c.ServeJSON()
	c.StopRun()
}

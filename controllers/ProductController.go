package controllers

import (
	"github.com/tuku/enums"
	"github.com/tuku/models"
)

//产品管理
type ProductController struct {
	BaseController
}

//Index 产品管理首页
func (c *ProductController) Index() {
	c.setTpl() //处理模板
	c.LayoutSections = make(map[string]string)
	c.LayoutSections["headcssjs"] = "product/index_headcssjs.html"
	c.LayoutSections["footerjs"] = "product/index_footerjs.html"
}

func (c *ProductController) TreeGrid() {
	tree := models.ProductTreeGrid()
	c.jsonResult(enums.JRCodeSucc, "", tree)
}

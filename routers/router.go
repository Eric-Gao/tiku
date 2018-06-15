package routers

import (
	"github.com/astaxie/beego"
	"github.com/tuku/controllers"
)

func init() {
	//产品管理
	beego.Router("/Product/Index", &controllers.ProductController{}, "*:Index")
	beego.Router("/Product/TreeGrid", &controllers.ProductController{}, "Get,Post:TreeGrid")

	beego.Router("/QuestionTemplate/Index", &controllers.QuestionTemplateController{}, "*:Index")
	beego.Router("/QuestionTemplate/DataGrid", &controllers.QuestionTemplateController{}, "Get,Post:DataGrid")
	beego.Router("/", &controllers.MainController{})
}

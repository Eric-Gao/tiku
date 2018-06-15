package models

import (
	"github.com/astaxie/beego"
	"github.com/astaxie/beego/orm"
)

func init() {
	orm.RegisterModel(new(BackendUser), new(Product), new(QuestionTemplate))
}

//下面是统一的表名管理
func TableName(name string) string {
	prefix := beego.AppConfig.String("db_dt_prefix")
	return prefix + name
}

//产品表
func ProductTBName() string {
	return TableName("product")
}

// 题型表  表名的规则小写遇到model大写转化小写加下划线
func QuestionTemplateTBName() string {
	return TableName("question_template")
}

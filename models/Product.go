package models

import (
	"time"

	"github.com/astaxie/beego/orm"
)

//Product 产品表
type Product struct {
	ProductId             int    `orm:"pk"`
	APPInfo               string `orm:"size(128)"`
	ProjectId             int
	Code                  string    `orm:"size(64)"`
	Name                  string    `orm:"size(64)"`
	Memo                  string    `orm:"size(256)"`
	IsDeleted             bool      `orm:"bool"`
	CreateDate            time.Time `orm:"auto_now_add;type(datetime)"` //auto_now_add 第一次保存时才设置时间
	ShortName             string    `orm:"size(32)"`
	QuestionImportEnabled int
	Logo                  string `orm:"size(400)"`
	AppLogo               string `orm:"size(400)"`
	ParentId              int
	PackageId             int
	AuthorCode            string `orm:"size(400)"`
	Weight                int
	UpdateDate            time.Time `orm:"auto_now;type(datetime)"` //auto_now 每次 model 保存时都会对时间自动更新
	Creater               int
	Updater               int
	ExamImportEnabled     int
	HtmlDisabled          int `orm:"-"` //在html里应用时是否可用
	Level                 int `orm:"-"`
}

func (a *Product) TableName() string {
	return ProductTBName()
}

func ProductTreeGrid() []*Product {
	query := orm.NewOrm().QueryTable(ProductTBName()).OrderBy("product_id")
	data := make([]*Product, 0)
	query.All(&data)
	return ProductToTreeGridSort(data)
}

func ProductToTreeGridSort(list []*Product) []*Product {
	result := make([]*Product, 0)
	for _, item := range list {
		if item.ParentId == 0 {
			item.Level = 0
			result = append(result, item)
			result = ProductAddSons(item, list, result)
		}
	}
	return result
}

func ProductAddSons(cur *Product, list, result []*Product) []*Product {
	for _, item := range list {
		if item.ParentId == cur.ProductId {
			item.Level = cur.Level + 1
			result = append(result, item)
			result = ProductAddSons(item, list, result)
		}
	}
	return result
}

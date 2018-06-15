package models

import (
	"time"

	"github.com/astaxie/beego/orm"
)

//题型对象
type QuestionTemplate struct {
	Id                 int
	TemplateId         int
	ProductId          int
	Name               string
	ShortName          string
	HasReferences      int
	ReferencesName     string
	IsSingleAnswer     int
	StemMaxCount       int
	StemOptionMaxCount int
	Status             int
	StemOptionShared   int
	Weight             int
	Creater            int
	CreateTime         time.Time `orm:"auto_now_add;type(datetime)"`
}

//题型查询
type QuestionTemplateQueryParam struct {
	BaseQueryParam
	NameLike string
}

func (a *QuestionTemplate) TableName() string {
	return QuestionTemplateTBName()
}
func QuestionTemplatePageList(params *QuestionTemplateQueryParam) ([]*QuestionTemplate, int64) {
	query := orm.NewOrm().QueryTable(QuestionTemplateTBName())
	data := make([]*QuestionTemplate, 0)
	//默认排序
	sortorder := "Id"
	switch params.Sort {
	case "Id":
		sortorder = "Id"
	case "Seq":
		sortorder = "Seq"
	}
	if params.Order == "desc" {
		sortorder = "-" + sortorder
	}
	query = query.Filter("name__istartswith", params.NameLike)
	total, _ := query.Count()
	query.OrderBy(sortorder).Limit(params.Limit, params.Offset).All(&data)
	return data, total
}

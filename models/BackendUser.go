package models

// import(
// 	"github.com/astaxie/beego/orm"
// )

type BackendUser struct {
	ID       int
	RealName string `orm:"size(32)"`
	UserName string `orm:"size(24)"`
	UserPwd  string `json:"-"`
}

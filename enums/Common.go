package enums

type JsonResultCode int

const (
	JRCodeSucc JsonResultCode = iota
	JRCodeFailed
	JRCode302 = 302
	JRCode401 = 401
)

const (
	Deleted = iota - 1
	Disabled
	Enabled
)

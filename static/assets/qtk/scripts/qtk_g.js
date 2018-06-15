/**
 * Created by lihaitao on 2017-7-11.
 */
var QTKGlobal = function () {

    //产品下拉加载
    //第一个url 获取产品列表的地址
    //第一个切换产品的 url
    ProductTreeInit = function (url, val, url2) {
        //初始化
        var dorpdown = $('#global-prodct-list');
        //加载数据
        $.post(url, {}, function (data) {
            if (data.code === 1) {
                dorpdown.html('');
                if (data.obj.length === 0) {
                    dorpdown.html('<option value=""></option>');
                    layer.alert('您没有可管理的产品', { icon: 0, title: '提示' });
                    dorpdown.selectpicker();
                } else {
                    var html = [];
                    $(data.obj).each(function (i, e) {
                        var str = new Array(e.Level * 4).join("&nbsp;");
                        if (e.Level > 0)
                            str = str + "|-";
                        html.push('<option value="' + e.ProductID + '" ');
                        if (e.HtmlDisabled == true || e.IsDeleted) {
                            html.push(' disabled');
                        }
                        html.push('>' + str + e.Name + '</option>');
                    });
                    dorpdown.html(html.join(''));
                    //BootstrapSelect初始化
                    dorpdown.selectpicker();
                    dorpdown.selectpicker('val', val);

                    var btn = dorpdown.closest('div').children('button:eq(0)');
                    if (btn !== null) {
                        var title = btn.text().replace(/(\s)|(\|-)/g, '');
                        btn.attr('title', '');
                        btn.children('span:eq(0)').text(title);
                    }
                    //changed事件里，删除title里空格和 |-
                    dorpdown.off('changed.bs.select').on('changed.bs.select', function (event, clickedIndex, newValue, oldValue) {
                        // do something...
                        var sel_item = $(this).children("option:eq('" + clickedIndex + "')");
                        var btn = $(this).closest('div').children('button:eq(0)');
                        //清除选项标题里的空格和 |-
                        var title = sel_item.text().replace(/(\s)|(\|-)/g, '');
                        btn.attr('title', '');
                        btn.children('span:eq(0)').text(title);
                        //切换产品                    
                        $.post(url2, { id: dorpdown.selectpicker('val') }, function (data) {
                            if (data.code === 1) {
                                layer.alert(data.msg, { icon: 1, title: '成功' }, function () {
                                    window.location.reload(true);
                                });
                            } else {
                                layer.alert(data.msg, { icon: 2, title: '错误' });
                            }
                        }, 'json');
                    });
                }
            }
            else {
                layer.alert('加载产品列表失败，请登录后重试', { icon: 2, title: '错误' });
            }
        }, 'json');
    }
    //左侧菜单初始化
    //主要功能是从地址里获取模块名称，然后将当前模块对应的菜单设置active
    //只支持到三级菜单
    SidebarMenuInit = function (CurPath) {        
        var pathname = window.location.pathname;
        if (CurPath.length > 0) {
            pathname = CurPath;
        }
        $(".page-sidebar-menu .nav-item").each(function (i, e) {
            //找出当前li
            if ($('a:eq(0)', this).attr('href') == pathname) {
                $(this).addClass('active');
                UpdateParentClass(this);
            }
        });
        //当前二级菜单为空时，隐藏一级菜单(同样试用于三级菜单)
        $(".page-sidebar-menu .sub-menu").each(function () {
            if ($(this).find("li").length == 0) {
                $(this).parents(".nav-item:eq(0)").hide();
            }
        });
    }
    //递归更新上级样式
    UpdateParentClass = function (item) {
        var parent = $(item).parents('.nav-item:eq(0)');
        if (parent.length === 0) return;
        parent.addClass('active');
        parent.find('.arrow:eq(0)').addClass('open');
        UpdateParentClass(parent);
    }
    //获取x-editable所需要的参数表,url为更新值时请求服务器地址，validate验证的方式，refreshPk成功后是否根据主键刷新列表
    getEditableParam = function (url, validate, refreshPk) {
        console.log('validate:'+validate);
        console.log('refreshPk'+refreshPk);
        var defaultvalidate = function (value) {
            if ($.trim(value).length === 0) {
                return "必填项";
            }
            if (!/^\d+$/.test(value)) {
                return "必须为正整数，且不大于999999";
            }
        };
        if (validate !== null && typeof (validate) !== 'undefined') {
            defaultvalidate = validate
        }
        return {
            url: url,
            type: 'text',
            onblur: 'cancel', //Action when user clicks outside the container. Can be cancel|submit|ignore.  Setting ignore allows to have several containers open.
            showbuttons: true,
            ajaxOptions: {
                type: 'post',
                dataType: 'json'
            },
            validate: defaultvalidate,
            success: function (response, newValue) {
                if (response.code == 1) {
                    parent.layer.msg(response.msg, { icon: 1, title: '成功' });                   
                    if (refreshPk) {
                        //刷新列表数据
                        refresh(response.obj);
                    }
                    else {
                        refresh();
                    }                    
                } else {
                    return response.msg;
                }
            },
            error: function (response, newValue) {
                if (response.status === 500) {
                    return '系统错误，请刷新后重试';
                } if (response.status === 404) {
                    return '请求失败，请刷新后重试';
                } else {
                    return response.responseText;
                }
            }
        }
    }
    //美化表格里的checkbox和radio，传入单选和多选的选择器
    uniformCheckboxAndRadio = function (chkSelector) {
        if (chkSelector !== null && typeof (chkSelector) !== 'undefined') {
            $(chkSelector).each(function (i, e) {
                if (!$(e).parent().is('label')) {
                    var type = $(e).prop('type') === 'checkbox' ? 'checkbox' : "radio";
                    $(e).wrap('<label class="mt-' + type + ' mt-' + type + '-outline" style=\'padding-left: 20px\'></label>');
                    $(e).parent().append('<span style="top: -15px;padding:0;"></span>');
                }
            });
        }
    }
    //全选和单选联动
    chkAllSingleInit = function (chkAllSelector, chkSingleSelector) {
        $(chkAllSelector).on('click', function () {
            $(chkSingleSelector + ':enabled').prop('checked', $(this).prop('checked'));
        });
        $(chkSingleSelector).on('click', function () {
            if ($(this).prop('checked') === false) {
                $(chkAllSelector).prop('checked', false);
            } else {
                var totalnum = $(chkSingleSelector + ':enabled').length;
                var checknum = $(chkSingleSelector + ":enabled:checked").length;
                $(chkAllSelector).prop('checked', totalnum === checknum);
            }
        });
    }
    return {
        //main function to initiate the module
        init: function () {
            //ProductTreeInit();
            //SidebarMenuInit();
        },
        ProductTreeInit:ProductTreeInit,
        SidebarMenuInit:SidebarMenuInit,
        alertXHRError: function (XHR, status, e) {
            if (typeof (XHR.responseText) !== 'undefined') {
                parent.layer.alert("请求失败：" + XHR.responseText, { icon: 2, title: '错误' });
            }
            else {
                parent.layer.alert("请求失败", { icon: 2, title: '错误' });
            }
        },
        //获取x-editable所需要的参数表
        getEditableParam: getEditableParam,
        //美化表格里的checkbox和radio，传入单选和多选的选择器
        uniformCheckboxAndRadio: uniformCheckboxAndRadio,
        //全选和单选联动
        chkAllSingleInit: chkAllSingleInit
    };

}();

jQuery(document).ready(function () {
    QTKGlobal.init();
});
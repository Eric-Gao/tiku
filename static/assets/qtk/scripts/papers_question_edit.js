
var contentManager = function () {
    var productID = $("#ProductID").val();
    var $contentBox = $("#tab_1_2");            //内容编辑Tab容器
    var questionID = $("#QuestionID").val();    //当前正在编辑的主题目ID
    var editting = 0;                           //是否处理编辑状态，如果不是，则从服务器端获取题目内容数据，如果是，则保持客户数据
    var template = null;//TemplateID Name HasReferences ReferencesName IsSingleAnswer StemMaxCount StemOptionMaxCount StemOptionShared AnswerIndexMin AnswerIndexMax
    var templates = null;
    var templateInfo = null;
    var content = {};                           //当前保持在客户端的数据
    var $stemDataGrid = $("#stemDataGrid");     //题干表格
    var $StemBox = $("#StemBox");               //题干容器
    var $imagesDataGrid = $("#imagesDataGrid"); //图片表格
    var $referencesBox = $("#ReferencesBox");   //参考资料容器
    var $analysisBox = $("#AnalysisBox");       //解析容器
    var options = null;
    //本地存储使用的辍
    var sdstorageprefix = 'question_content_';
    //有效期
    var sdstorageexp = '3d'; //3天
    //初始化
    function init(opt) {
        options = opt;
        //获取题型
        getTemplateInfoFromSrv();
        GetTemplates();
        if (template === null) {
            layer.alert('题型信息无效，初始化失败', { icon: 2, title: '错误' });
            content = {};
            return;
        }
        //显示题型信息
        showTemplateInfo(template);
        //如果为未编辑，则从服务器端或者localStorage获取数据
        if (editting === 0) {
            //获取题目内容
            //先从localStorage获取
            var content_local = getfromlocal();
            if (content_local) {
                layer.confirm('系统检测到上次编辑后未保存的数据，是否继续编辑？', {
                    btn: ['是', '否'], icon: 3, title: '请确认',
                    end: function () {
                        formatAndShowContent();
                    }
                }, function (index) {
                    content = JSON.parse(content_local);
                    layer.close(index);
                }, function () {
                    //不继续编辑则从服务器端获取
                    getContentFromSrv();
                    //从本地消除
                    removelocal();
                });
            } else {
                //本地不存在，从服务器端获取
                getContentFromSrv();
                formatAndShowContent();
            }
            //设为编辑状态
            editting = 1;
        } else {
            formatAndShowContent();
        }
    }
    function formatAndShowContent() {
        //根据题型格式化Content
        if (template.TemplateID != 100) {
            formatContent();
        }
        //显示题目内容
        showContent();
    }
    function getfromlocal() {
        //获取数据
        var data = sdstorage.get(sdstorageprefix + questionID);
        return data;
    }
    function savetolocal() {
        //保存7天
        sdstorage.save(sdstorageprefix + questionID, JSON.stringify(content), sdstorageexp);
    }
    function removelocal() {
        sdstorage.remove(sdstorageprefix + questionID);
    }
    //删除已过期的题目内容数据
    function removelocalexp() {
        sdstorage.removeexp(sdstorageprefix);
    }
    //从服务器端获取题型信息
    function getTemplateInfoFromSrv() {
        $.sdpost(options.getTemplateUrl, { id: questionID }, function (re) {
            if (re.code === 1) {
                template = re.obj;
            } else {
                layer.alert(re.msg, { icon: 2, title: '错误' });
            }
        }, false);//同步       
    }
    //从服务器端获取题型列表
    function GetTemplates() {
        $.sdpost(options.getTemplatesUrl, {}, function (re) {
            if (re.code == 1) {
                templates = re.obj
            } else {
                layer.alert(re.msg, { icon: 2, title: "失败" });
            }
        }, false);
    }

    //显示题型信息
    function showTemplateInfo(data) {
        var info = [];
        info.push('题型名称：' + data.Name);
        info.push((data.HasReferences === 1 ? '有' : '无') + '参考资料');
        if (template.TemplateID != 100) {
            info.push((data.IsSingleAnswer === 1 ? '单' : '多') + '选');
            info.push('题干最大数量：' + data.StemMaxCount);
            info.push('选项最大数量：' + data.StemOptionMaxCount);
            info.push((data.StemOptionShared === 1 ? '' : '不') + '共用选项');
            //如果非单选，则显示答案数量限制
            if (data.IsSingleAnswer === 0 && data.StemOptionMaxCount > 0) {
                info.push('最小答案数：' + data.AnswerIndexMin);
                info.push('最大答案数：' + data.AnswerIndexMax);
            }
        }
        $(".templateInfo", $contentBox).text(info.join('，   '));
    }
    //从服务器端获取题目内容
    function getContentFromSrv() {
        $.sdpost(options.getQuestionContentUrl, { id: questionID }, function (re) {
            if (re.code === 1) {
                content = re.obj;
            } else {
                layer.alert(re.msg, { icon: 2, title: '错误' });
            }
        }, false);
    }
    //格式化题目内容
    function formatContent() {
        //更新内容里的模板id
        content.Template = template.TemplateID;
        if (template.HasReferences === 0) {
            //如果没有参数资料，则将内容中的参数资料设成空
            content.References = '';
        }
        if (template.StemMaxCount < content.Stems.length) {
            //如果题干过多
            content.Stems.splice(template.StemMaxCount, content.Stems.length - template.StemMaxCount);
        }
        for (var i = 0; i < content.Stems.length; i++) {
            var curStem = content.Stems[i];
            if (template.StemOptionMaxCount < curStem.Options.length) {
                //如果选项过多
                var delArray = curStem.Options.splice(template.StemOptionMaxCount, curStem.Options.length - template.StemOptionMaxCount);
                //将答案中 已删除选项的Index删除
                $(delArray).each(function (i1, e) {
                    var answerIndex = $.inArray(e.Index, curStem.AnswerOptionsIndexs);
                    if (answerIndex > -1) {
                        curStem.AnswerOptionsIndexs.splice(answerIndex, 1);
                    }
                });
            }
            //单选
            if (template.IsSingleAnswer === 1 && curStem.AnswerOptionsIndexs.length > 1) {
                //如果答案过多
                curStem.AnswerOptionsIndexs.splice(1, curStem.AnswerOptionsIndexs.length - 1);
            }
            //多选
            if (template.IsSingleAnswer === 0 && curStem.AnswerOptionsIndexs.length > template.AnswerIndexMax) {
                //如果答案过多
                curStem.AnswerOptionsIndexs.splice(template.AnswerIndexMax, curStem.AnswerOptionsIndexs.length - template.AnswerIndexMax);
            }
            if (i > 0 && template.StemOptionShared === 1) {
                //第二项开始，判断是否共用选项
                curStem.Options = content.Stems[0].Options;
            } else {
                //如果不是共用选项，且原来共用，则需要独立
                if (curStem.Options === content.Stems[0].Options) {
                    //不能用splice
                    curStem.Options = JSON.parse(JSON.stringify(curStem.Options));
                }
            }
        }
    }
    //显示题目内容
    function showContent() {
        //显示参考资料
        showReferences();
        //显示题干
        showStem();
        //显示图片
        showImages();
        //显示解析       
        showAnalysis();

        //console.log(JSON.stringify(content));
    }
    //显示参考资料
    function showReferences() {
        if (template.HasReferences === 1) {
            $referencesBox.show();
            $referencesBox.find('.ReferencesName').text(template.ReferencesName);
            $referencesBox.find('.content').html(content.References);
        } else {
            $referencesBox.hide();
        }
    }
    //编辑解析
    function referencesEdit() {
        openEditor({
            title: '编辑' + template.ReferencesName,
            srcData: content.References,
            finished: function (newData) {
                content.References = newData;
                showReferences();
                //保存至本地
                savetolocal();
            }
        });
    }
    //题干表格
    function showStem() {
        //保存当前页面滚动条位置    
        var scrollTop = $(window).scrollTop();
        $stemDataGrid.bootstrapTable('destroy');
        $stemDataGrid.bootstrapTable({
            data: content.Stems,
            idField: 'Index',
            sortName: 'Index',
            sortOrder: 'asc',
            resizable: true,
            columns: [{
                field: 'Index',
                title: '序号',
                align: 'center',
                width: '80px',
                formatter: function (value, row, index) {
                    return row.Index + 1
                }
            }, {
                field: 'Content',
                title: '题干',
                class: 'ellipsis',
                width: '300px',
                //formatter: function (value, row, index) {
                //    return ScriptTool.showlongstr(value);
                //}
            }, {
                field: 'Difficulty',
                title: '难度',
                width: '100px'
            }, {
                field: 'TemplateID',
                title: '题干题型',
                //class: 'break-all',
                width: '120px',
                formatter: function (value, row, index) {
                    if (GetTemplateInfo(row.TemplateID).length > 0) {
                        return templateInfo[0].ShortName;
                    }
                    else {
                        return "";
                    }
                }
            }, {
                field: 'MaterialType',
                title: '素材类型',
                width: '120px',
                formatter: function (value, row, index) {
                    return GetmaterialType(value);
                }
            }, {
                field: 'MaterialContent',
                title: '素材地址',
                class: 'ellipsis',
                width: '200px',
                formatter: function (value, row, index) {
                    return ScriptTool.showlongstr(value);
                }
            }, {
                field: 'Index',
                title: '选项管理',
                width: '80px',
                visible: template.StemOptionMaxCount > 0 && options.readOnly === 0,
                formatter: function (value, row, index) {
                    var ret = [];
                    ret.push('<button class="btn btn-success btn-xs"  onclick="contentManager.optionAdd(' + row.Index + ')"');
                    if (template.TemplateID == 100 && GetTemplateInfo(row.TemplateID).length > 0) {
                        if (row.Options.length >= templateInfo[0].StemOptionMaxCount) {
                            ret.push('disabled');
                        }
                    }
                    else {
                        //如果达到最大选项数量，则禁用按钮
                        if (row.Options.length >= template.StemOptionMaxCount) {
                            ret.push('disabled');
                        }
                    }
                    ret.push(' >增加选项</button>');
                    return ret.join('');
                }
            }, {
                field: 'operate',
                title: '操作',
                width: '100px',
                visible: options.readOnly === 0,
                formatter: function (value, row, index) {
                    var ret = [];
                    ret.push('<button class="btn btn-primary btn-xs"  onclick="contentManager.stemEdit(' + row.Index + ')">编辑</button>');
                    ret.push('<button class="btn btn-danger btn-xs"  onclick="contentManager.stemDel(' + row.Index + ')">删除</button>');
                    return ret.join('');
                }
            }],
            detailView: template.StemOptionMaxCount > 0, //题型里设置的选项数量大于0时，显示
            onExpandRow: function (index, prow, $detail) {
                //初始化选项表
                var $subtable = $detail.html('<table></table>').find('table');
                $subtable.bootstrapTable({
                    data: prow.Options,
                    columns: [{
                        field: 'Code',
                        title: '编号',
                        align: 'center',
                        width: '40px',
                    }, {
                        field: 'Content',
                        title: '选项',
                        class: 'break-all',
                    }, {
                        field: 'Index',
                        title: '是否答案',
                        width: '80px',
                        align: 'center',
                        formatter: function (value, row, index) {
                            if ($.inArray(value, prow.AnswerOptionsIndexs) > -1) {
                                return '<label class="label label-success">是</label>';
                            } else {
                                return '<label class="label label-default">否</label>';
                            }
                        }
                    }, {
                        field: 'operate',
                        title: '操作',
                        width: '165px',
                        visible: options.readOnly === 0,
                        formatter: function (value, row, index) {
                            var ret = [];
                            ret.push('<button class="btn btn-primary btn-xs"  onclick="contentManager.optionEdit(' + prow.Index + ',' + row.Index + ')">编辑</button>');
                            ret.push('<button class="btn btn-danger btn-xs"  onclick="contentManager.optionDel(' + prow.Index + ',' + row.Index + ')">删除</button>');
                            //综合题型相关渲染
                            if (template.TemplateID == 100 && templateInfo.length > 0) {
                                //如果不是答案
                                if ($.inArray(row.Index, prow.AnswerOptionsIndexs) === -1) {
                                    //是单选，多者多选时答案数据不到最大限制
                                    if (templateInfo[0].IsSingleAnswer === 1 || (templateInfo[0].IsSingleAnswer === 0 && prow.AnswerOptionsIndexs.length < templateInfo[0].AnswerIndexMax)) {
                                        ret.push('<button class="btn btn-success btn-xs"  onclick="contentManager.optionSetAnswer(' + prow.Index + ',' + row.Index + ',' + prow.TemplateID + ')">设为答案</button>');
                                    }
                                } else {
                                    //如果是答案且为多选,或者为单选时答案数却大于1
                                    if (templateInfo[0].IsSingleAnswer === 0 || (templateInfo[0].IsSingleAnswer === 1 && prow.AnswerOptionsIndexs.length > 1)) {
                                        ret.push('<button class="btn btn-danger btn-xs"  onclick="contentManager.optionNotAnswer(' + prow.Index + ',' + row.Index + ',' + prow.TemplateID + ')">不是答案</button>');
                                    }
                                }
                            }
                            else {
                                //如果不是答案
                                if ($.inArray(row.Index, prow.AnswerOptionsIndexs) === -1) {
                                    //是单选，多者多选时答案数据不到最大限制
                                    if (template.IsSingleAnswer === 1 || (template.IsSingleAnswer === 0 && prow.AnswerOptionsIndexs.length < template.AnswerIndexMax)) {
                                        ret.push('<button class="btn btn-success btn-xs"  onclick="contentManager.optionSetAnswer(' + prow.Index + ',' + row.Index + ')">设为答案</button>');
                                    }
                                } else {
                                    //如果是答案且为多选,或者为单选时答案数却大于1
                                    if (template.IsSingleAnswer === 0 || (template.IsSingleAnswer === 1 && prow.AnswerOptionsIndexs.length > 1)) {
                                        ret.push('<button class="btn btn-danger btn-xs"  onclick="contentManager.optionNotAnswer(' + prow.Index + ',' + row.Index + ')">不是答案</button>');
                                    }
                                }
                            }
                            return ret.join('');
                        }
                    }],
                });
            }
        });
        //展开节点显示子表格
        $stemDataGrid.bootstrapTable("expandAllRows");
        //滚动到当前位置
        $(window).scrollTop(scrollTop);
        //如果达到最大题干数量，则禁用按钮
        if (content.Stems.length >= template.StemMaxCount && template.TemplateID != 100) {
            $('.stemAdd', $StemBox).prop('disabled', true);
        } else {
            $('.stemAdd', $StemBox).prop('disabled', false);
        }
    }
    function GetTemplateInfo(value) {
        templateInfo = $(templates).filter(function (i, e) { return e.TemplateID === parseInt(value) });
        return templateInfo;
    }
    function GetmaterialType(value) {
        var texts = options.materialTypes;
        return ScriptTool.showenum(parseInt(value), texts);
    }
    function stemAdd() {
        layer.open({
            type: 2,
            title: "添加题干",
            shadeClose: false,
            shade: 0.2,
            maxmin: true,
            shift: 1,
            area: ['1000px', '95%'],
            scrollbar: false,
            content: options.QuestionStemEditUrl,
            btn: ['完成', '取消'],
            success: function (layero, index) {
                var iframeWin = window[layero.find('iframe')[0]['name']];
                //iframeWin.setDifficulty(content.Stems[stemIndex].Difficulty);
                //iframeWin.setTemplateID(content.Stems[stemIndex].TemplateID);
                iframeWin.setContent("");
                //iframeWin.setUrl(content.Stems[stemIndex].MaterialContent);
                //iframeWin.setType(content.Stems[stemIndex].MaterialType);
            },
            yes: function (index, layero) {
                var iframeWin = window[layero.find('iframe')[0]['name']];
                if (iframeWin.FormSubmit() === 1) {
                    var Options = [];
                    if (template.StemOptionShared === 1) {
                        if (content.Stems.length > 0) {
                            Options = content.Stems[0].Options;
                        }
                    }
                    var newIndex = content.Stems.length;
                    var Difficulty = iframeWin.getDifficulty();
                    var TemplateID = iframeWin.getTemplateID();
                    var Content = iframeWin.getContent();
                    var MaterialContent = iframeWin.getUrl();
                    var MaterialType = iframeWin.getType();
                    var newOpt = { "Index": newIndex, "Difficulty": Difficulty, "TemplateID": TemplateID, "Content": Content, "MaterialContent": MaterialContent, "MaterialType": MaterialType, "AnswerOptionsIndexs": [], "Options": Options };
                    content.Stems.push(newOpt);
                    showStem();
                    //保存至本地
                    savetolocal();
                    layer.close(index);
                }
            }
        });
        ////使用富文本编辑器
        //openEditor({
        //    title: "增加题干",
        //    area: ['1000px', '600px'],
        //    srcData: '',
        //    finished: function (newData) {
        //        var Options = [];
        //        if (template.StemOptionShared === 1) {
        //            if (content.Stems.length > 0) {
        //                Options = content.Stems[0].Options;
        //            }
        //        }
        //        content.Stems.push({ "Index": content.Stems.length, "Content": newData, "AnswerOptionsIndexs": [], "Options": Options });
        //        showStem();
        //        //保存至本地
        //        savetolocal();
        //    }
        //});
    }
    function stemEdit(stemIndex) {
        layer.open({
            type: 2,
            title: "编辑题干",
            shadeClose: false,
            shade: 0.2,
            maxmin: true,
            shift: 1,
            area: ['1000px', '95%'],
            scrollbar: false,
            content: options.QuestionStemEditUrl,
            btn: ['完成', '取消'],
            success: function (layero, index) {
                var iframeWin = window[layero.find('iframe')[0]['name']];
                iframeWin.setDifficulty(content.Stems[stemIndex].Difficulty);
                iframeWin.setTemplateID(content.Stems[stemIndex].TemplateID);
                iframeWin.setContent(content.Stems[stemIndex].Content);
                iframeWin.setUrl(content.Stems[stemIndex].MaterialContent);
                iframeWin.setType(content.Stems[stemIndex].MaterialType);
            },
            yes: function (index, layero) {
                var iframeWin = window[layero.find('iframe')[0]['name']];
                if (iframeWin.FormSubmit() === 1) {
                    var curStem = content.Stems[stemIndex];
                    if (curStem !== undefined) {
                        content.Stems[stemIndex].Difficulty = iframeWin.getDifficulty();
                        content.Stems[stemIndex].TemplateID = iframeWin.getTemplateID();
                        content.Stems[stemIndex].Content = iframeWin.getContent();
                        content.Stems[stemIndex].MaterialContent = iframeWin.getUrl();
                        content.Stems[stemIndex].MaterialType = iframeWin.getType();
                        showStem();
                        //保存至本地
                        savetolocal();
                        layer.close(index);
                    } else {
                        layer.alert('题干信息无效，请重试', { icon: 2, title: '错误' });
                    }
                }
            }
        });
        //使用富文本编辑器
        //openEditor({
        //    title: "编辑题干",
        //    area: ['1000px', '600px'],
        //    srcData: content.Stems[stemIndex].Content,
        //    finished: function (newData) {
        //        content.Stems[stemIndex].Content = newData;
        //        showStem();
        //        //保存至本地
        //        savetolocal();
        //    }
        //});
    }
    function stemDel(stemIndex) {
        layer.confirm('是否要删除该题干？', {
            btn: ['是', '否'], icon: 3, title: '请确认'
        }, function (index) {
            //删除题干，并重新整理Index
            content.Stems.splice(stemIndex, 1);
            for (var i = 0; i < content.Stems.length; i++) {
                content.Stems[i].Index = i;
            }
            showStem();
            //保存至本地
            savetolocal();
            layer.close(index);
        });
    }
    function optionAdd(stemIndex) {
        //使用富文本编辑器
        openEditor({
            title: "增加选项",
            area: ['1000px', '600px'],
            srcData: '',
            finished: function (newData) {
                var curStem = content.Stems[stemIndex];
                if (curStem !== undefined) {
                    var newIndex = curStem.Options.length;
                    var newOpt = { "Index": newIndex, "Content": newData, "Code": Number2Char(newIndex) };
                    curStem.Options.push(newOpt);
                    showStem();
                    //保存至本地
                    savetolocal();
                } else {
                    layer.alert('题干信息无效，请重试', { icon: 2, title: '错误' });
                }
            }
        });
    }
    function optionEdit(stemIndex, optIndex) {
        //使用富文本编辑器
        openEditor({
            title: "编辑选项",
            area: ['1000px', '600px'],
            srcData: content.Stems[stemIndex].Options[optIndex].Content,
            finished: function (newData) {
                content.Stems[stemIndex].Options[optIndex].Content = newData;
                showStem();
                //保存至本地
                savetolocal();
            }
        });
    }
    function optionDel(stemIndex, optIndex) {
        layer.confirm('是否要删除该选项？', {
            btn: ['是', '否'], icon: 3, title: '请确认'
        }, function (index) {
            var curStem = content.Stems[stemIndex];
            if (curStem !== undefined) {
                //删除选项
                curStem.Options.splice(optIndex, 1);
                //处理答案 删除答案  大于optIndex的值都减1
                var ansIndex = $.inArray(optIndex, curStem.AnswerOptionsIndexs);
                if (ansIndex > -1) {
                    curStem.AnswerOptionsIndexs.splice(ansIndex, 1);
                }
                $(curStem.AnswerOptionsIndexs).each(function (i, e) {
                    if (e > optIndex) {
                        curStem.AnswerOptionsIndexs[i] = e - 1;
                    }
                });
                //重新整理Index
                for (var i = 0; i < curStem.Options.length; i++) {
                    curStem.Options[i].Index = i;
                    curStem.Options[i].Code = Number2Char(i);
                }
                showStem();
                //保存至本地
                savetolocal();
                layer.close(index);
            } else {
                layer.alert('题干信息无效，请重试', { icon: 2, title: '错误' });
            }
        });
    }
    //设置答案
    function optionSetAnswer(stemIndex, optIndex, prowTemplate = 0) {
        var curStem = content.Stems[stemIndex];
        if (curStem !== undefined) {
            if (GetTemplateInfo(prowTemplate).length > 0) {//综合题型
                //如果是单选，则清空已有答案
                if (templateInfo[0].IsSingleAnswer === 1) {
                    curStem.AnswerOptionsIndexs = [];
                }
                if ($.inArray(optIndex, curStem.AnswerOptionsIndexs) === -1) {
                    curStem.AnswerOptionsIndexs.push(optIndex);
                    curStem.AnswerOptionsIndexs.sort();
                }
                showStem();
                //保存至本地
                savetolocal();

            } else {
                //如果是单选，则清空已有答案
                if (template.IsSingleAnswer === 1) {
                    curStem.AnswerOptionsIndexs = [];
                }
                if ($.inArray(optIndex, curStem.AnswerOptionsIndexs) === -1) {
                    curStem.AnswerOptionsIndexs.push(optIndex);
                    curStem.AnswerOptionsIndexs.sort();
                }
                showStem();
                //保存至本地
                savetolocal();
            }

        } else {
            layer.alert('题干信息无效，请重试', { icon: 2, title: '错误' });
        }
    }
    //不为答案
    function optionNotAnswer(stemIndex, optIndex, prowTemplate = 0) {
        var curStem = content.Stems[stemIndex];
        if (curStem !== undefined) {
            if (GetTemplateInfo(prowTemplate).length > 0) {//综合题型
                //如果是多选题
                if (curStem.AnswerOptionsIndexs.length <= templateInfo[0].AnswerIndexMin && templateInfo[0].IsSingleAnswer === 0) {
                    layer.alert('该题答案数至少为 ' + templateInfo[0].AnswerIndexMin + ' ，请设置正确答案后，再进行此操作', { icon: 0, title: '提示' });
                    return;
                } else {
                    var answerIndex = $.inArray(optIndex, curStem.AnswerOptionsIndexs);
                    if (answerIndex > -1) {
                        curStem.AnswerOptionsIndexs.splice(answerIndex, 1);
                    }
                    showStem();
                    //保存至本地
                    savetolocal();
                }
            }
            else {
                //如果是多选题
                if (curStem.AnswerOptionsIndexs.length <= template.AnswerIndexMin && template.IsSingleAnswer === 0) {
                    layer.alert('该题答案数至少为 ' + template.AnswerIndexMin + ' ，请设置正确答案后，再进行此操作', { icon: 0, title: '提示' });
                    return;
                } else {
                    var answerIndex = $.inArray(optIndex, curStem.AnswerOptionsIndexs);
                    if (answerIndex > -1) {
                        curStem.AnswerOptionsIndexs.splice(answerIndex, 1);
                    }
                    showStem();
                    //保存至本地
                    savetolocal();
                }
            }

        } else {
            layer.alert('题干信息无效，请重试', { icon: 2, title: '错误' });
        }
    }
    function showImages() {
        $imagesDataGrid.find('tbody').html('');
        var html = [];
        $(content.Images).each(function (i, e) {
            html.push('<tr>');
            html.push('<td><img style="max-width:300px;max-height:200px;" src="' + options.questionImageHost + e + '" /></td>');
            html.push('<td class="break-all">' + options.questionImageHost + e + '</td>');
            html.push('<td style="width:80px;">');
            //第二条开显示上移
            if (i > 0) {
                html.push('<button class="btn yellow-gold btn-xs"  onclick="contentManager.imagesUp(' + i + ')"><i class="fa fa-arrow-up"></i></button>');
            }
            //除最后一条，显示下移
            if (i < content.Images.length - 1) {
                html.push('<button class="btn blue  btn-xs"  onclick="contentManager.imagesDown(' + i + ')"><i class="fa fa-arrow-down"></i></button>');
            }
            html.push('</td>');
            html.push('<td>');
            html.push('<button class="btn btn-danger btn-xs"  onclick="contentManager.imagesDel(' + i + ')">删除</button>');
            html.push('</td>');
            html.push('</tr>');
        });
        $imagesDataGrid.find('tbody').html(html.join(''));
        //如果是指读则，隐藏操作列
        if (options.readOnly === 1) {
            var hideindex = $imagesDataGrid.find('tr').find('td').length - 3;
            $imagesDataGrid.find('tr').find('td:gt(' + hideindex + '),th:gt(' + hideindex + ')').hide();
        }
    }
    function imagesAdd() {
        layer.open({
            type: 2,
            title: '添加图片',
            shadeClose: false,
            shade: 0.2,
            maxmin: true,
            shift: 1,
            area: ['1000px', '400px'],
            scrollbar: false,
            content: options.imagesAdd,
            btn: ['完成', '取消'],
            yes: function (index, layero) {
                var iframeWin = window[layero.find('iframe')[0]['name']];
                var url = iframeWin.FormSubmit();
                if (url.length > 0) {
                    if (content.Images === null) {
                        content.Images = [];
                    }
                    //添加图片
                    content.Images.push(url.replace('~/upload/QuestionImages/', ''));
                    //显示图片
                    showImages();
                    //保存至本地
                    savetolocal();
                    layer.close(index);
                }
            }
        });
    }
    //素材 文案编辑 type  属于哪个模块
    function contentEdit(title) {
        layer.open({
            type: 2,
            title: title,
            shadeClose: false,
            shade: 0.2,
            maxmin: true,
            shift: 1,
            area: ['1000px', '600px'],
            scrollbar: false,
            content: options.contentEditUrl,
            btn: ['完成', '取消'],
            success: function (layero, index) {
                var iframeWin = window[layero.find('iframe')[0]['name']];
                if (title === "题目解析") {
                    iframeWin.setContent(content.Analysis);
                    iframeWin.setUrl(content.MaterialContent);
                    iframeWin.setType(content.MaterialType);
                }
            },
            yes: function (index, layero) {
                var iframeWin = window[layero.find('iframe')[0]['name']];
                if (iframeWin.FormSubmit() === 1) {
                    //添加内容、解析缓存
                    if (title === "题目解析") {
                        content.Analysis = iframeWin.getContent();
                        content.MaterialContent = iframeWin.getUrl();
                        content.MaterialType = iframeWin.getType();
                        showAnalysis();
                    }
                    savetolocal();
                    layer.close(index);
                }
            }
        });
    }
    function imagesDel(imgIndex) {
        layer.confirm('是否要删除该图片？', {
            btn: ['是', '否'], icon: 3, title: '请确认'
        }, function (index) {
            content.Images.splice(imgIndex, 1);
            //显示图片
            showImages();
            //保存至本地
            savetolocal();
            layer.close(index);
        });
    }
    function imagesUp(imgIndex) {
        if (imgIndex > 0) {
            //移动
            var temp = content.Images[imgIndex - 1];
            content.Images[imgIndex - 1] = content.Images[imgIndex];
            content.Images[imgIndex] = temp;
            //显示图片
            showImages();
            //保存至本地
            savetolocal();
        } else {
            layer.alert('已经到顶部', { icon: 0, title: '提示' });
        }
    }
    function imagesDown(imgIndex) {
        if (imgIndex < content.Images.length - 1) {
            //移动
            var temp = content.Images[imgIndex + 1];
            content.Images[imgIndex + 1] = content.Images[imgIndex];
            content.Images[imgIndex] = temp;
            //显示图片
            showImages();
            //保存至本地
            savetolocal();
        } else {
            layer.alert('已经到底部', { icon: 0, title: '提示' });
        }
    }
    //显示解析
    function showAnalysis() {
        $analysisBox.find('.content').html(content.Analysis);
        $analysisBox.find("* [id= 'MaterialType']").selectpicker('val', content.MaterialType);
        $analysisBox.find('.materialcontent').html(content.MaterialContent);
    }
    //编辑解析
    function analysisEdit() {
        //使用富文本编辑器
        openEditor({
            title: "编辑文字解析",
            srcData: content.Analysis,
            finished: function (newData) {
                content.Analysis = newData;
                showAnalysis();
                //保存至本地
                savetolocal();
            }
        });
    }
    //取消操作
    function undo() {
        layer.confirm('是否要将题目内容恢复到最后一次保存时的状态？', {
            btn: ['是', '否'], icon: 3, title: '请确认'
        }, function (index) {
            getContentFromSrv();
            //显示题目内容
            showContent();
            //清除本地暂存
            removelocal();
            layer.close(index);
        });
    }
    //检查内容是否可以保存
    function validContent() {
        var ret = true;
        //检查参考资料
        if (template.HasReferences === 1 && $.trim(content.References).length === 0) {
            layer.alert('请填写参考资料', { icon: 2, title: '错误' });
            return false;
        }
        //检查题干和选项
        if (content.Stems.length === 0) {
            layer.alert('请添加题干', { icon: 2, title: '错误' });
            return false;
        }
        for (var i = 0; i < content.Stems.length; i++) {
            var curStem = content.Stems[i];
            //如果最大选项数大于0,则需要添加选项
            if (template.StemOptionMaxCount > 0) {
                //如果是多选，则选项数要>=最小答案数，如果是单选，选项数要大于1
                if ((template.IsSingleAnswer === 0 && curStem.Options.length < template.AnswerIndexMin) || (template.IsSingleAnswer === 1 && curStem.Options.length <= 1)) {
                    layer.alert('请为序号为 ' + (i + 1) + ' 的题干添加选项 ', { icon: 2, title: '错误' });
                    return false;
                }
            }
            //当题干的选项大于0时判断答案
            if (curStem.Options.length > 0) {
                //检查答案 单选
                if (template.IsSingleAnswer === 1 && (curStem.AnswerOptionsIndexs.length > 1 || curStem.AnswerOptionsIndexs.length === 0)) {
                    layer.alert('请为序号为 ' + (i + 1) + ' 的题干(单选)设置正确答案 ', { icon: 2, title: '错误' });
                    return false;
                }

                //检查答案 多选
                if (template.IsSingleAnswer === 0 &&
                    //答案数据于小最小限制 或者 > 选项数 或者 > 最大限制
                    (curStem.AnswerOptionsIndexs.length < template.AnswerIndexMin ||
                        curStem.AnswerOptionsIndexs.length > template.AnswerIndexMax ||
                        curStem.AnswerOptionsIndexs.length > curStem.Options.length)) {
                    layer.alert('请为序号为 ' + (i + 1) + ' 的题干(多选)设置正确答案 ', { icon: 2, title: '错误' });
                    return false;
                }
            }
        }
        //检查解析
        if ($.trim(content.Analysis).length === 0) {
            layer.alert('请填写文字解析', { icon: 2, title: '错误' });
            return false;
        }
        return ret;
    }
    //保存至服务器
    function save2srv() {
        if (template.TemplateID == 100 || validContent()) {
            var url = options.saveQuestionContentUrl;
            var dataValues = { id: questionID, 'content': JSON.stringify(content) };
            $.sdpost(options.saveQuestionContentUrl, dataValues, function (re) {
                if (re.code === 1) {
                    layer.msg(re.msg, { icon: 1, title: '成功' });
                    //修改题目审核状态
                    //ResetAuditStatus();
                    //清除本地暂存
                    removelocal();
                } else {
                    layer.alert(re.msg, { icon: 2, title: '错误' });
                }
            });
        }
        //删除已过期的本地数据
        removelocalexp();
    }
    //使用富文本编辑器
    function openEditor(opt) {
        var defaults = {
            title: "编辑内容",
            area: ['1000px', '95%'],
            srcData: '',
        };
        var destOptions = $.extend({}, defaults, opt);
        layer.open({
            type: 2,
            title: destOptions.title,
            shadeClose: false,
            shade: 0.2,
            maxmin: true,
            shift: 1,
            area: destOptions.area,
            scrollbar: false,
            content: options.editorUrl,
            btn: ['完成', '取消'],
            success: function (layero, index) {
                var iframeWin = window[layero.find('iframe')[0]['name']];
                iframeWin.setContent(destOptions.srcData);
            },
            yes: function (index, layero) {
                var iframeWin = window[layero.find('iframe')[0]['name']];
                if (iframeWin.FormSubmit() === 1) {
                    if (destOptions.finished) {
                        destOptions.finished(iframeWin.getContent());
                    }
                    layer.close(index);
                }
            }
        });
    }
    // A B C ... 2 ... 0 1 2
    function Char2Number(char) {
        var chars = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',];
        return $.inArray(char, chars);
    }
    // 0 1 2 ... 2 ... A B C
    function Number2Char(num) {
        var chars = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',];
        if (num < 26 && num > -1) {
            return chars[num];
        }
    }
    return {
        init: init,
        stemAdd: stemAdd,
        stemDel: stemDel,
        stemEdit: stemEdit,
        optionAdd: optionAdd,
        optionDel: optionDel,
        optionEdit: optionEdit,
        optionSetAnswer: optionSetAnswer,
        optionNotAnswer: optionNotAnswer,
        imagesAdd: imagesAdd,
        contentEdit: contentEdit,
        imagesDel: imagesDel,
        imagesUp: imagesUp,
        imagesDown: imagesDown,
        referencesEdit: referencesEdit,
        //analysisEdit: analysisEdit,
        //materialEdit: materialEdit,
        undo: undo,
        save: save2srv,
    };
}();
//标签编辑
var tagsManager = function () {
    var options = null;
    var questionID = $("#QuestionID").val();    //当前正在编辑的主题目ID
    //初始化
    function init(opt) {
        options = opt;
        //显示标签
        showTags();
    }
    //显示标签
    function showTags() {
        var dataValues = { id: questionID };
        $.sdpost(options.getTags, dataValues, function (re) {
            if (re.code === 1) {
                $('.QuestionTags').val(re.obj);
                if (options.readOnly === 1) {
                    $('.QuestionTags').prop('readonly', true);
                } else {
                    $('.QuestionTags').tagsinput({
                        tagClass: 'label label-success'
                    });
                }
            } else {
                layer.alert(re.msg, { icon: 2, title: '错误' });
            }
        });
    }
    //保存标签
    function saveTags() {
        var dataValues = { id: questionID, Tags: $('.QuestionTags').val() };
        $.sdpost(options.saveTags, dataValues, function (re) {
            if (re.code === 1) {
                layer.msg(re.msg, { icon: 1, title: '成功' });
            } else {
                layer.alert(re.msg, { icon: 2, title: '错误' });
            }
        });
    }
    return {
        init: init,
        saveTags: saveTags
    };

}();

//关联试卷
var examManager = function () {
    function init(opt) {
        dataGridInit(opt);
    }
    function dataGridInit(opt) {
        layer.load();
        opt.examDataGrid.bootstrapTable("destroy");
        opt.examDataGrid.bootstrapTable({
            url: opt.examGridUrl,
            method: 'post',
            sidePagination: 'server', //服务器端用 server
            idField: 'ExamID',
            queryParamsType: '',
            queryParams: function (params) {
                params.questionid = $("#QuestionID").val();    //当前正在编辑的主题目ID
                return params;
            },
            pagination: true,
            showRefresh: true,
            showColumns: true,
            toolbar: '#toolbar',
            pageSize: 10,
            pageList: [5, 10, 20, 100, 200],
            classes: 'tablelayoutfix table table-hover',
            undefinedText: '',
            sortName: 'ExamID',
            sortOrder: 'desc',
            paginationUseBSSelect: true,
            resizable: true,
            cookie: true,               //将columns,page等参数存入cookie
            rowAttributes: function (row, index) {
                return { 'data-pk': row.ExamID }
            },
            columns: [{
                field: 'ExamID',
                title: '试卷ID',
                width: '80px',
                sortable: true
            }, {
                field: 'Name',
                title: '试卷名称',
                class: 'ellipsis',
                width: '250px',
                formatter: function (value, row, index) {
                    return ScriptTool.showlongstr(value);
                }
            }, {
                field: 'GroupID',
                title: '考试ID',
                width: '80px',
                sortable: true
            }, {
                field: 'ExamGroupName',
                title: '考试名称',
                class: 'ellipsis',
                width: '250px',
                formatter: function (value, row, index) {
                    return ScriptTool.showlongstr(value);
                }
            }, {
                field: 'MinutesCount',
                title: '考试时长',
                width: '80px',
                align: 'center'
            }, {
                field: 'TotalQuestionStemCount',
                title: '题干总数',
                width: '80px',
                align: 'center'
            }, {
                field: 'CreateDate',
                title: '创建时间',
                align: 'center',
                width: '160px',
                visible: false
            }, {
                field: 'IsDeleted',
                title: '是否删除',
                width: '80px',
                align: 'center',
                formatter: function (value, row, index) {
                    return ScriptTool.showyes(value);
                },
                visible: false
            }],
            onLoadSuccess: function (data) {
                layer.closeAll('loading');
            },
            onLoadError: function (status) {
                layer.alert('获取数据失败,错误代码：' + status);
            }
        });
    }
    return {
        init: init
    }
}()



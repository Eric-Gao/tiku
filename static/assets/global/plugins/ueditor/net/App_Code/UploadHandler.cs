using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web;
using System.Configuration;
using QuanTiKu.Common;
using QuanTiKu.Infrastructure.Common;
namespace QuanTiKu.WebBack.Content
{
    /// <summary>
    /// UploadHandler 的摘要说明
    /// </summary>
    public class UploadHandler : Handler
    {
        //是否优化图片，默认否
        static readonly int ueEditorImageAutoCompress = AppSettingManager.AppSettings["UEEditorImageAutoCompress"] == null ? 0 : int.Parse(AppSettingManager.AppSettings["UEEditorImageAutoCompress"]);
        //如果优化图片，限制最大宽度
        static readonly int ueEditorImageAutoCompressMaxWidth = AppSettingManager.AppSettings["UEEditorImageAutoCompress_MaxWidth"] == null ? 0 : int.Parse(AppSettingManager.AppSettings["UEEditorImageAutoCompress_MaxWidth"]);
        //如果优化图片，是否保存原图，默认否
        static readonly int ueEditorImageAutoCompress_RemainSrc = AppSettingManager.AppSettings["UEEditorImageAutoCompress_RemainSrc"] == null ? 0 : int.Parse(AppSettingManager.AppSettings["UEEditorImageAutoCompress_RemainSrc"]);
        //压缩图片时，新图片的名称扩展
        static readonly string destNameExt = ueEditorImageAutoCompress_RemainSrc == 1 ? "_cp" : "";

        public UploadConfig UploadConfig { get; private set; }
        public UploadResult Result { get; private set; }

        public UploadHandler(HttpContext context, UploadConfig config)
            : base(context)
        {
            this.UploadConfig = config;
            this.Result = new UploadResult() { State = UploadState.Unknown };
        }

        public override void Process()
        {
            byte[] uploadFileBytes = null;
            string uploadFileName = null;

            if (UploadConfig.Base64)
            {
                uploadFileName = UploadConfig.Base64Filename;
                uploadFileBytes = Convert.FromBase64String(Request[UploadConfig.UploadFieldName]);
            }
            else
            {
                var file = Request.Files[UploadConfig.UploadFieldName];
                uploadFileName = file.FileName;

                if (!CheckFileType(uploadFileName))
                {
                    Result.State = UploadState.TypeNotAllow;
                    WriteResult();
                    return;
                }
                if (!CheckFileSize(file.ContentLength))
                {
                    Result.State = UploadState.SizeLimitExceed;
                    WriteResult();
                    return;
                }

                uploadFileBytes = new byte[file.ContentLength];
                try
                {
                    file.InputStream.Read(uploadFileBytes, 0, file.ContentLength);
                }
                catch (Exception)
                {
                    //这里需要记录日志
                    //~~~
                    Result.State = UploadState.NetworkError;
                    WriteResult();
                }
            }

            Result.OriginFileName = uploadFileName;

            var savePath = PathFormatter.Format(uploadFileName, UploadConfig.PathFormat);
            var localPath = Server.MapPath(savePath);
            try
            {
                if (!Directory.Exists(Path.GetDirectoryName(localPath)))
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(localPath));
                }
                File.WriteAllBytes(localPath, uploadFileBytes);

                //上传的图片自动压缩，如果压缩，则更新savePath，原图不删除
                if (ImageAutoCompress(localPath))
                {
                    string ext = Path.GetExtension(savePath);
                    if (ext != null)
                        savePath = savePath.Replace(ext, destNameExt + ext);
                }

                Result.Url = savePath.TrimStart('~');//20170818 如果在配置文件里使用~/作为路径，这里需要删除
                Result.State = UploadState.Success;
            }
            catch (Exception e)
            {
                Result.State = UploadState.FileAccessError;
                Result.ErrorMessage = e.Message;
                //这里需要记录日志
            }
            finally
            {
                WriteResult();
            }
        }
        /// <summary>
        /// 上传的图片自动压缩
        /// </summary>
        /// <param name="localPath"></param>
        private bool ImageAutoCompress(string localPath)
        {
            bool ret = false;
            //进行压缩处理的文件尾缀
            const string needCompressExt = ".BMP|.PNG|.JPG|.JEPG";
            try
            {
                string ext = Path.GetExtension(localPath);
                if (ext != null)
                {
                    string destPath = localPath.Replace(ext, destNameExt + ext);
                    if (ueEditorImageAutoCompress == 1 && needCompressExt.IndexOf(ext.ToUpper(), StringComparison.Ordinal) != -1)
                    {
                        string error = string.Empty;
                        string mimeType = "image/jpeg";
                        //如果是以png结尾的图片，则mimeType png
                        if(ext.ToUpper() == ".PNG"){
                            mimeType = "image/png";
                        }
                        new ImageTool().GetCompressImage(destPath, localPath, ueEditorImageAutoCompressMaxWidth, 0, 93, out error, mimeType);
                        ret = true;
                    }
                }
            }
            catch (Exception ex)
            {
                //日志
                //NLogUtil.Error(string.Format("{0}_{1}", ex.Message, ex.StackTrace));
            }
            return ret;
        }
        private void WriteResult()
        {
            this.WriteJson(new
            {
                state = GetStateMessage(Result.State),
                url = Result.Url,
                title = Result.OriginFileName,
                original = Result.OriginFileName,
                error = Result.ErrorMessage
            });
        }

        private string GetStateMessage(UploadState state)
        {
            switch (state)
            {
                case UploadState.Success:
                    return "SUCCESS";
                case UploadState.FileAccessError:
                    return "文件访问出错，请检查写入权限";
                case UploadState.SizeLimitExceed:
                    return "文件大小超出服务器限制";
                case UploadState.TypeNotAllow:
                    return "不允许的文件格式";
                case UploadState.NetworkError:
                    return "网络错误";
            }
            return "未知错误";
        }

        private bool CheckFileType(string filename)
        {
            var fileExtension = Path.GetExtension(filename).ToLower();
            return UploadConfig.AllowExtensions.Select(x => x.ToLower()).Contains(fileExtension);
        }

        private bool CheckFileSize(int size)
        {
            return size < UploadConfig.SizeLimit;
        }
    }

    public class UploadConfig
    {
        /// <summary>
        /// 文件命名规则
        /// </summary>
        public string PathFormat { get; set; }

        /// <summary>
        /// 上传表单域名称
        /// </summary>
        public string UploadFieldName { get; set; }

        /// <summary>
        /// 上传大小限制
        /// </summary>
        public int SizeLimit { get; set; }

        /// <summary>
        /// 上传允许的文件格式
        /// </summary>
        public string[] AllowExtensions { get; set; }

        /// <summary>
        /// 文件是否以 Base64 的形式上传
        /// </summary>
        public bool Base64 { get; set; }

        /// <summary>
        /// Base64 字符串所表示的文件名
        /// </summary>
        public string Base64Filename { get; set; }
    }

    public class UploadResult
    {
        public UploadState State { get; set; }
        public string Url { get; set; }
        public string OriginFileName { get; set; }

        public string ErrorMessage { get; set; }
    }

    public enum UploadState
    {
        Success = 0,
        SizeLimitExceed = -1,
        TypeNotAllow = -2,
        FileAccessError = -3,
        NetworkError = -4,
        Unknown = 1,
    }

}
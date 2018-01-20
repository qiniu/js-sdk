declare namespace Qiniu {
	interface File {
		completeTimestamp: number;
		destroy(): void;
		getNative(): void;
		getSource(): string;
		id: string;
		lastModifiedDate: Date;
		loaded: number;
		name: string;
		origSize: number;
		percent: number;
		size: number;
		speed: string;
		status: number;
		type: string;
	}
	interface Options {
		disable_statistics_report: boolean;   // 禁止自动发送上传统计信息到七牛，默认允许发送
		runtimes: string;	// 'html5,flash,html4'      // 上传模式,依次退化
		browse_button: string | HTMLElement;         // 上传选择的点选按钮，**必需**
		// 在初始化时，uptoken, uptoken_url, uptoken_func 三个参数中必须有一个被设置
		// 切如果提供了多个，其优先级为 uptoken > uptoken_url > uptoken_func
		// 其中 uptoken 是直接提供上传凭证，uptoken_url 是提供了获取上传凭证的地址，如果需要定制获取 uptoken 的过程则可以设置 uptoken_func
		uptoken: string; // uptoken 是上传凭证，由其他程序生成
		uptoken_url: string;         // Ajax 请求 uptoken 的 Url，**强烈建议设置**（服务端提供）
		uptoken_func: (file: string) => string | Promise<string>;    // 在需要获取 uptoken 时，该方法会被调用
		get_new_uptoken: boolean;             // 设置上传文件的时候是否每次都重新获取新的 uptoken
		downtoken_url: string;			// Ajax请求downToken的Url，私有空间时使用,JS-SDK 将向该地址POST文件的key和domain,服务端返回的JSON必须包含`url`字段，`url`值为该文件的下载地址
		unique_names: boolean;              // 默认 false，key 为文件名。若开启该选项，JS-SDK 会为每个文件自动生成key（文件名）
		save_key: boolean;                  // 默认 false。若在服务端生成 uptoken 的上传策略中指定了 `save_key`，则开启，SDK在前端将不对key进行任何处理
		domain: string;     // bucket 域名，下载资源时用到，如：'http://xxx.bkt.clouddn.com/' **必需**
		container: string;             // 上传区域 DOM ID，默认是 browser_button 的父元素，
		max_file_size: string;             // 最大文件体积限制
		flash_swf_url: string;  //引入 flash,相对路径
		max_retries: number;                     // 上传失败最大重试次数
		dragdrop: boolean;                     // 开启可拖曳上传
		drop_element: string;          // 拖曳上传区域元素的 ID，拖曳文件或文件夹后可触发上传
		chunk_size: string;                  // 分块上传时，每块的体积
		auto_start: boolean;                   // 选择文件后自动上传，若关闭需要自己绑定事件触发上传,
		filters: Partial<{
			max_file_size: string,
			prevent_duplicates: boolean;
			// Specify what files to browse for
			mime_types: Array<{
				title: string;
				extensions: string;
			}>;
		}>,
		x_vars: {
			[key: string]: (up: plupload, file: File) => any;
			//    自定义变量，参考http://developer.qiniu.com/docs/v6/api/overview/up/response/vars.html
		};
		init: Partial<{
			// 文件添加进队列后,处理相关的事情
			FilesAdded(up: plupload, files: File[]): void;
			// 删除文件事件
			FilesRemoved(up: plupload, files: File[]): void;
			// 每个文件上传前,处理相关的事情
			BeforeUpload(up: plupload, file: File): void;
			// 每个文件上传时,处理相关的事情
			UploadProgress(up: plupload, file: File): void;
			// 分片上传信息
			ChunkUploaded(up: plupload, file: File, info: {
				offset: number;
				response: string;
				responseHeaders: string;
				status: number;
				total: number;
			}): void;
			// 每个文件上传成功后,处理相关的事情
			// 其中 info.response 是文件上传成功后，服务端返回的json，形式如
			// {
			//    "hash": "Fh8xVqod2MQ1mocfI4S4KpRL6D98",
			//    "key": "gogopher.jpg"
			//  }
			// 参考http://developer.qiniu.com/docs/v6/api/overview/up/response/simple-response.html
			FileUploaded(up: plupload, file: File, info: { response: string; }): void;
			//上传出错时,处理相关的事情
			Error(up: plupload, err: any, errTip: string): void;
			//队列文件处理完毕后,处理相关的事情
			UploadComplete(up: plupload, uploaded_files: File[]): void;
			// 若想在前端对每个文件的key进行个性化处理，可以配置该函数
			// 该配置必须要在 unique_names: false , save_key: false 时才生效
			Key(up: plupload, file: File): string;
		}>;
	}
	function uploader<Uploader extends plupload>(options: Partial<Options>): Uploader;
}

declare module 'qiniu-js' {
	import 'plupload';
	export = Qiniu;
}

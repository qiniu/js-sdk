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
	interface UploadOptions extends plupload_settings {
		disable_statistics_report: boolean;   // 禁止自动发送上传统计信息到七牛，默认允许发送
		// 在初始化时，uptoken, uptoken_url, uptoken_func 三个参数中必须有一个被设置
		// 切如果提供了多个，其优先级为 uptoken > uptoken_url > uptoken_func
		// 其中 uptoken 是直接提供上传凭证，uptoken_url 是提供了获取上传凭证的地址，如果需要定制获取 uptoken 的过程则可以设置 uptoken_func
		uptoken: string; // uptoken 是上传凭证，由其他程序生成
		uptoken_url: string;         // Ajax 请求 uptoken 的 Url，**强烈建议设置**（服务端提供）
		uptoken_func: (file: string) => string | Promise<string>;    // 在需要获取 uptoken 时，该方法会被调用
		get_new_uptoken: boolean;             // 设置上传文件的时候是否每次都重新获取新的 uptoken
		downtoken_url: string;			// Ajax请求downToken的Url，私有空间时使用,JS-SDK 将向该地址POST文件的key和domain,服务端返回的JSON必须包含`url`字段，`url`值为该文件的下载地址
		save_key: boolean;                  // 默认 false。若在服务端生成 uptoken 的上传策略中指定了 `save_key`，则开启，SDK在前端将不对key进行任何处理
		domain: string;     // bucket 域名，下载资源时用到，如：'http://xxx.bkt.clouddn.com/' **必需**
		max_file_size: string;             // 最大文件体积限制
		dragdrop: boolean;                     // 开启可拖曳上传
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
		init?: Partial<{
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
			Error(up: plupload, err: any): void;
			//队列文件处理完毕后,处理相关的事情
			UploadComplete(up: plupload, uploaded_files: File[]): void;
			// 若想在前端对每个文件的key进行个性化处理，可以配置该函数
			// 该配置必须要在 unique_names: false , save_key: false 时才生效
			Key(up: plupload, file: File): string;
		}>;
	}
	function uploader<Uploader extends plupload>(options: Partial<UploadOptions>): Uploader;

	interface WaterMarkOptions1 {
		mode: 1;			// 图片水印
		image: string;		// 图片水印的Url，mode = 1 时 **必需**
		dissolve?: number;	// 透明度，取值范围1-100，非必需，下同
		gravity?: string;	// 水印位置，为以下参数[NorthWest、North、NorthEast、West、Center、East、SouthWest、South、SouthEast]之一
		dx: number;			// 横轴边距，单位:像素(px)
		dy: number;			// 纵轴边距，单位:像素(px)
	}
	interface WaterMarkOptions2 {
		mode: 2;			// 图片水印
		text: string;		// 水印文字，mode = 2 时 **必需**
		dissolve?: number;	// 透明度，取值范围1-100，非必需，下同
		gravity?: string;	// 水印位置，为以下参数[NorthWest、North、NorthEast、West、Center、East、SouthWest、South、SouthEast]之一
		fontsize: number;	// 字体大小，单位: 缇
		font: string;		// 水印文字字体
		dx: number;			// 横轴边距，单位:像素(px)
		dy: number;			// 纵轴边距，单位:像素(px)
		fill: string;		// 水印文字颜色，RGB格式，可以是颜色名称
	}
	function watermark(options: WaterMarkOptions1 | WaterMarkOptions2, key: string): string;

	interface ImageView2Options {
		mode: 0 | 1 | 2 | 3 | 4 | 5;	// 缩略模式，共6种[0-5]
		w: number;						// 具体含义由缩略模式决定
		h: number;						// 具体含义由缩略模式决定
		q: number;						// 新图的图像质量，取值范围：1-100
		format: 'png'  // 新图的输出格式，取值范围：jpg，gif，png，webp等
	}

	function imageView2(optoins: ImageView2Options, key: string): string;

	interface ImageMogr2Options {
		'auto-orient'?: boolean;		// 布尔值，是否根据原图EXIF信息自动旋正，便于后续处理，建议放在首位。
		strip?: boolean;				// 布尔值，是否去除图片中的元信息
		thumbnail?: string;			// 缩放操作参数
		crop?: string;				// 裁剪操作参数
		gravity?: string;			// 裁剪锚点参数
		quality?: number;			// 图片质量，取值范围1-100
		rotate?: number;			// 旋转角度，取值范围1-360，缺省为不旋转。
		format?: string;				// 新图的输出格式，取值范围：jpg，gif，png，webp等
		blur?: string;				// 高斯模糊参数
	}

	function imageMogr2(optoins: ImageMogr2Options, key: string): string;

	interface ImageInfo {
		size: number;							// 文件大小，单位：Bytes
		format: 'png' | 'jpeg' | 'gif' | 'bmp';	// 图片类型，如png、jpeg、gif、bmp等。
		width: number;							// 图片宽度，单位：像素(px) 。
		height: number;							// 图片高度，单位：像素(px) 。
		colorModel: string;						// 彩色空间，如palette16、ycbcr等。
		frameNumber?: number;					// 帧数，gif 图片会返回此项。
	}

	function imageInfo(key: string): ImageInfo;

	interface ExtendedInfo {
		code: number;
		error: string;
		[key: string]: {
			type: number;
			val: string;
		} | number | string;
	}

	function exif(key: string): ImageInfo;

	interface WaterMarkFopOptions1 extends WaterMarkOptions1 {
		fop: 'watermark' | string; // 指定watermark操作
	}

	interface WaterMarkFopOptions2 extends WaterMarkOptions2 {
		fop: 'watermark' | string; // 指定watermark操作
	}

	interface ImageViewFopOptions extends ImageView2Options {
		fop: 'imageView2' | string; // 指定watermark操作
	}

	interface ImageMogrFopOptions extends ImageMogr2Options {
		fop: 'imageMogr2' | string; // 指定watermark操作
	}

	function pipeline(fos: (WaterMarkFopOptions1 | WaterMarkFopOptions2 | ImageViewFopOptions | ImageMogrFopOptions)[], key: string): string;
}

declare module 'qiniu-js' {
	import 'plupload';
	export = Qiniu;
}

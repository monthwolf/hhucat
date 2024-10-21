Component({
    properties: {
        previewSize: {
            type: String,
            value: '150rpx'
        },
        previewImage: {
            type: Boolean,
            value: true
        },
        previewFullImage: {
            type: Boolean,
            value: true
        },
        previewFile: {
            type: Boolean,
            value: true
        },
        multiple: {
            type: Boolean,
            value: false
        },
        disabled: {
            type: Boolean,
            value: false
        },
        showUpload: {
            type: Boolean,
            value: true
        },
        deletable: {
            type: Boolean,
            value: true
        },
        capture: {
            type: Array,
            value: ['album', 'camera']
        },
        maxSize: {
            type: Number,
            value: 200 * 1024 * 1024
        },
        maxCount: {
            type: Number,
            value: 9
        },
        uploadText: {
            type: String,
            value: '上传'
        },
        videoFit: {
            type: String,
            value: 'contain'
        },
        imageFit: {
            type: String,
            value: 'scaleToFill'
        },
        useBeforeRead: {
            type: Boolean,
            value: false
        },
        camera: {
            type: String,
            value: 'back'
        },
        compressed: {
            type: Boolean,
            value: true
        },
        maxDuration: {
            type: Number,
            value: 60
        },
        accept: {
            type: Array,
            value: ['image', 'video']
        }
    },

    data: {
        fileList: []
    },
    lifetimes: {
        attached() {
            // 组件加载时清空 fileList
            this.resetFileList();
        }
    },
    methods: {
        resetFileList() {
            this.setData({
                fileList: []
            });
            // 触发一个事件，通知父组件 fileList 已被重置
            this.triggerEvent('reset');
        },
        onChooseFile() {
            if (this.properties.disabled) return;

            const {
                maxCount,
                accept,
                maxSize,
                camera,
                compressed,
                maxDuration,
                capture
            } = this.properties;
            const {
                fileList
            } = this.data;

            wx.chooseMedia({
                count: this.properties.multiple ? (maxCount - fileList.length) : 1,
                mediaType: accept,
                sourceType: capture,
                maxDuration,
                camera,
                compressed,
                success: (res) => {
                    const newFiles = res.tempFiles.map(file => ({
                        url: file.tempFilePath,
                        name: file.name || 'File',
                        type: file.fileType,
                        thumb: file.thumbTempFilePath,
                        size: file.size,
                        isImage: file.fileType === 'image',
                        isVideo: file.fileType === 'video'
                    }));

                    this.handleFilesAdded(newFiles);
                }
            });
        },

        handleFilesAdded(newFiles) {
            const {
                useBeforeRead,
                maxSize
            } = this.properties;
            const {
                fileList
            } = this.data;

            const oversizeFiles = newFiles.filter(file => file.size > maxSize);
            if (oversizeFiles.length) {
                this.triggerEvent('oversize', {
                    files: oversizeFiles
                });
                return;
            }

            if (useBeforeRead) {
                newFiles.forEach(file => {
                    this.triggerEvent('before-read', {
                        file,
                        callback: (shouldRead) => {
                            if (shouldRead) {
                                this.processAddedFile(file);
                            }
                        }
                    });
                });
            } else {
                newFiles.forEach(this.processAddedFile.bind(this));
            }
        },

        processAddedFile(file) {
            const updatedFileList = [...this.data.fileList, file];
            this.setData({
                fileList: updatedFileList
            });
            this.triggerEvent('after-read', {
                file
            });
        },

        onDelete(event) {
            if (!this.properties.deletable) return;

            const {
                index
            } = event.currentTarget.dataset;
            const updatedFileList = this.data.fileList.filter((_, i) => i !== index);
            this.setData({
                fileList: updatedFileList
            });
            this.triggerEvent('delete', {
                index
            });
        },

        onPreview(event) {
            if (!this.properties.previewFullImage && !this.properties.previewFile) return;

            const {
                index
            } = event.currentTarget.dataset;
            const {
                fileList
            } = this.data;
            const file = fileList[index];

            if (file.isImage && this.properties.previewFullImage) {
                wx.previewImage({
                    urls: fileList.filter(f => f.isImage).map(f => f.url),
                    current: file.url
                });
            } else if (file.isVideo && this.properties.previewFile) {
                wx.previewMedia({
                    sources: [{
                        url: file.url,
                        type: 'video'
                    }],
                });
            } else if (this.properties.previewFile) {
                // Handle other file types preview if needed
                wx.showToast({
                    title: '暂不支持该文件类型的预览',
                    icon: 'none'
                });
            }

            this.triggerEvent('click-preview', {
                index,
                file
            });
        }
    }
});
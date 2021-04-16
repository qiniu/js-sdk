<template>
  <Card :bordered="false" title="上传任务列表">
    <Space slot="extra">
      <Upload
        :before-upload="beforeUpload"
        :file-list="uploadFileList"
        :multiple="true"
        :showUploadList="false"
      >
        <Button icon="plus">添加文件</Button>
      </Upload>
      <Button
        :disabled="uploadFileList.length < 1"
        icon="play-circle"
        type="primary"
        @click="toggleModalVisible">开始上传
      </Button>
    </Space>
    <List
      :data-source="uploadTaskList"
      :locale="{ emptyText: '暂无数据' }"
      :rowKey="item => item.id"
      item-layout="horizontal"
    >
      <ListItem slot="renderItem" slot-scope="item, index">
        <ListItemMeta>
          <p slot="title">{{ item.fileName }}</p>
          <Progress
            slot="description"
            :percent="item.progress"
            :status="item.status"
            :stroke-color="{ from: '#108ee9', to: '#87d068' }"
          />
          <Avatar
            slot="avatar"
            icon="file"
            shape="square"
            size="large"
            style="background-color: #18a9fb"
          />
        </ListItemMeta>
        <Button icon="delete" shape="circle" type="link" @click="handleDelete(index)" />
      </ListItem>
    </List>
    <ConfirmModal :visible="modalVisible" @cancel="toggleModalVisible" @ok="handleUpload" />
  </Card>
</template>

<script lang="ts">
import Vue from 'vue'
import * as Qiniu from 'qiniu-js'
import { Avatar, Button, Card, List, Progress, Space, Upload } from 'ant-design-vue'
import ConfirmModal, { ConfirmModalFormValue } from '@/components/ConfirmModal.vue'
import { Observer, Regions } from '@/constants'
import { generateTaskId } from '@/utils/task'

export interface AppData {
  modalVisible: boolean
  currentUpload: string
  uploadRegion: Regions
  uploadToken: string
  uploadFileList: File[]
}

export interface UploadTask {
  id: string
  fileName: string
  observer: Observer
  progress: number
  status: Progress['status']
}

export default Vue.extend({
  name: 'App',
  components: {
    Card,
    Upload,
    Button,
    Space,
    List,
    ListItem: List.Item,
    ListItemMeta: List.Item.Meta,
    Avatar,
    Progress,
    ConfirmModal
  },
  data (): AppData {
    return {
      modalVisible: false,
      currentUpload: '',
      uploadToken: '',
      uploadRegion: Regions.z2,
      uploadFileList: []
    }
  },
  computed: {
    uploadTaskList: function (): UploadTask[] {
      const config = {
        useCdnDomain: true,
        region: this.uploadRegion
      }

      return this.uploadFileList.map<UploadTask>((file: File) => {
        const putExtra = {
          fname: file.name
        }

        return {
          id: generateTaskId(file.name),
          fileName: file.name,
          observer: Qiniu.upload(file, file.name, this.uploadToken, putExtra, config),
          progress: 0,
          status: 'normal'
        }
      })
    }
  },
  methods: {
    toggleModalVisible () {
      this.modalVisible = !this.modalVisible
    },
    beforeUpload: function (file: File) {
      this.uploadFileList.push(file)
      return false
    },
    handleUpload ({ token, region }: ConfirmModalFormValue) {
      this.uploadRegion = region
      this.uploadToken = token
      // You can use any AJAX library you like
      // request({
      //   url: 'https://www.mocky.io/v2/5cc8019d300000980a055e76',
      //   method: 'post',
      //   processData: false,
      //   data: formData,
      //   success: () => {
      //     this.fileList = []
      //     this.uploading = false
      //     this.$message.success('upload successfully.')
      //   },
      //   error: () => {
      //     this.uploading = false
      //     this.$message.error('upload failed.')
      //   }
      // })
    },
    handleDelete (index: number) {
      this.uploadFileList.splice(index, 1)
    }
  }
})
</script>

<style>

</style>

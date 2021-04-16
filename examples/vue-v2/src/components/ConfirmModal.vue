<template>
  <Modal
    :destroyOnClose="true"
    :visible="visible"
    cancelText="取消"
    okText="确定"
    title="填写上传信息"
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <Form :form="form" :label-col="{ span: 5 }" :wrapper-col="{ span: 12 }">
      <FormItem label="token">
        <Input
          v-decorator="['token', { rules: [{ required: true, message: '请输入 token' }] }]"
          placeholder="请输入 token"
        />
      </FormItem>
      <FormItem label="上传区域">
        <Select
          v-decorator="['region', { rules: [{ required: true, message: '请选择上传区域' }] } ]"
          placeholder="请选择上传区域"
        >
          <SelectOption value="male">
            male
          </SelectOption>
        </Select>
      </FormItem>
    </Form>
  </Modal>
</template>

<script lang="ts">
import Vue from 'vue'
import { Form, Input, Modal, Select } from 'ant-design-vue'
import { WrappedFormUtils } from 'ant-design-vue/types/form/form'
import { Regions } from '@/constants'

Modal.install(Vue)

export interface ConfirmModalFormValue {
  token: string
  region: Regions
}

export interface ConfirmModalData {
  form: WrappedFormUtils
}

export default Vue.extend({
  name: 'ConfirmModal',
  components: {
    Modal,
    Form,
    FormItem: Form.Item,
    Input,
    Select,
    SelectOption: Select.Option
  },
  props: {
    visible: {
      type: Boolean,
      required: true
    }
  },
  data (): ConfirmModalData {
    return {
      form: this.$form.createForm(this, { name: 'uploadInfo' })
    }
  },
  methods: {
    handleOk () {
      this.form.validateFields((err: any, values: ConfirmModalFormValue) => {
        if (!err) {
          this.$emit('ok', values)
          this.$emit('cancel')
        }
      })
    },
    handleCancel () {
      this.$emit('cancel')
    }
  }
})
</script>

<style>

</style>

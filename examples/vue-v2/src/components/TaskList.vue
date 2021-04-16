<template>
  <List
    :data-source="taskList"
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
</template>

<script>
import Vue from 'vue'
import { Avatar, Button, List, Progress } from 'ant-design-vue'

export default Vue.extend({
  name: 'TaskList',
  components: {
    List,
    ListItem: List.Item,
    ListItemMeta: List.Item.Meta,
    Avatar,
    Progress,
    Button
  },
  props: {
    taskList: {
      type: Array,
      required: true
    }
  },
  methods: {
    handleDelete (index) {
      this.$emit('delete', index)
    }
  }
})
</script>

<style scoped>

</style>

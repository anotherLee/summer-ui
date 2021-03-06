<template>
  <div class="s-table-wrapper" ref="wrapper">
    <div class="s-table-inner" ref="inner" :style="{ height: height + 'px', overflow: 'auto' }">
      <table class="s-table" :class="{ bordered: borderVisible, compact, striped }" ref="table">
        <thead>
        <tr>
          <th v-if="expandField" style="width: 50px" class="s-table-center"></th>
          <th v-if="checkable" :style="{width: '50px'}" class="s-table-center">
            <input type="checkbox" ref="allCheck" :checked="allSelected" @change="onChangeAll($event)">
          </th>
          <th class="s-table-header" :style="{width:`${column.width}px`}" v-for="column in columns" :key="column.field">
            <div class="s-table-header-inner">
              {{ column.text }}
              <span
                      v-if="orderBy.hasOwnProperty(column.field)"
                      class="s-table-sorter" @click="changeOrderBy(column.field)">
              <Icon name="ascend" :class="{active: orderBy[column.field] === 'ascend'}"></Icon>
              <Icon name="descend" :class="{active: orderBy[column.field] === 'descend'}"></Icon>
            </span>
            </div>
          </th>
          <th v-if="$scopedSlots.default" ref="actionHeader"></th>
        </tr>
        </thead>
        
        <tbody>
        <template v-for="(item, index) in dataSource">
          <tr :key="item.id">
            <td v-if="expandField" style="width: 50px;" class="s-table-center">
              <Icon
                      v-if="item[expandField]"
                      @click.native="expandItem(item.id)"
                      class="s-table-expand-icon"
                      :class="{ expand: expandedIds.includes(item.id) }"
                      name="right"></Icon>
            </td>
            <td :style="{width: '50px'}" class="s-table-center" v-if="checkable">
              <input
                      type="checkbox"
                      :checked="selectedHasSelf(item)"
                      @change="onChangeItem(item, index, $event)">
            </td>
            <template v-for="column in columns">
              <td :style="{width: column.width + 'px'}">{{ item[column.field] }}</td>
            </template>
            <td v-if="$scopedSlots.default">
              <div class="s-table-action" ref="action">
                <slot :item="item"></slot>
              </div>
            </td>
          </tr>
          
          <tr v-if="item[expandField] && expandedIds.includes(item.id)" :key="`${item.id}-expand`">
            <td style="border: none"></td>
            <td :colspan="colspan(columns.length)" style="border: none">
              {{ item[expandField] }}
            </td>
          </tr>
        </template>
        </tbody>
      </table>
    </div>
    <div v-if="loading" class="s-table-loading">
      <Icon name="loading"></Icon>
    </div>
  </div>
</template>

<script>
  import Icon from '../icon/Icon'

  export default {
    name: 's-table',
    props: {
      /*
       * 表头
       */
      columns: {
        type: Array,
        required: true
      },
      /*
       * 所有的数据
       */
      dataSource: {
        type: Array,
        required: true,
        validator(arr) {
          let noIdItems = arr.filter(item => !item.id)
          return noIdItems.length === 0
        }
      },
      /*
       * 被选中的数据
       */
      selectedItems: {
        type: Array,
        required: true,
        default: () => []
      },
      /*
       * 外边框
       */
      borderVisible: {
        type: Boolean,
        default: false
      },
      /*
       * 是否紧凑
       */
      compact: {
        type: Boolean,
        default: false
      },
      /*
       * 是否有斑马纹
       */
      striped: {
        type: Boolean,
        default: true
      },
      /*
       * 排序规则
       */
      orderBy: {
        type: Object,
        default: () => ({})
      },

      /*
       * loading
       */
      loading: {
        type: Boolean,
        default: false
      },

      /*
       * height 用做滚动
       */
      height: {
        type: [Number, String]
      },

      /*
       * expand-key 点击展开的字段说明
       */
      expandField: {
        type: String
      },

      /*
       * checkable 是否有 checkbox
       */
      checkable: {
        type: Boolean,
        default: false
      }
    },
    data() {
      return {
        copyTable: undefined,
        expandedIds: []
      }
    },
    computed: {
      /*
       * 判断是否全部选中
       */
      allSelected() {
        const a = this.selectedItems.map(item => item.id).sort()
        const b = this.dataSource.map(item => item.id).sort()

        if (a.length === b.length) {
          for (let i = 0; i < a.length; ++i) {
            if (a[i] !== b[i]) {
              return false
            }
          }
          return true
        }
        return false
      }
    },
    watch: {
      selectedItems() {
        let { allCheck } = this.$refs
        let length = this.selectedItems.length
        if (length > 0 && length < this.dataSource.length) {
          allCheck.indeterminate = true
        } else {
          allCheck.indeterminate = false
        }
      }
    },
    mounted() {
      const { wrapper, table, inner } = this.$refs
      this.copyTable = table.cloneNode(false)
      this.copyTable.classList.add('s-table-copy')
      const { height } = table.children[0].getBoundingClientRect()
      this.copyTable.appendChild(table.children[0])
      inner.style.marginTop = `${height}px`
      inner.style.height = parseInt(this.height) - height + 'px'
      Array.from(this.copyTable.children).map(node => {
        if (node.tagName.toLowerCase() !== 'thead') {
          node.remove()
        }
      })
      wrapper.appendChild(this.copyTable)

      if (this.$scopedSlots.default) {
        this.setActionWidth()
      }
    },
    methods: {
      /*
       * 选中或取消一项
       */
      onChangeItem(item, index, $event) {
        let selected = $event.target.checked
        let copy = JSON.parse(JSON.stringify(this.selectedItems))
        if (selected) {
          copy.push(item)
        } else {
          copy.splice(this.selectedItems.findIndex(ele => ele.id === item.id), 1)
        }
        this.$emit('update:selectedItems', copy)
      },

      /*
       * 选中或者取消全部
       */
      onChangeAll(e) {
        let selected = e.target.checked
        let all = JSON.parse(JSON.stringify(this.dataSource))
        this.$emit('update:selectedItems', selected ? all : [])
      },

      /*
       * 判断选中的 selectedItems 中是否有自己
       */
      selectedHasSelf(selfItem) {
        return this.selectedItems.find(ele => ele.id === selfItem.id)
      },

      /*
       * 点击排序
       */
      changeOrderBy(field) {
        const copy = JSON.parse(JSON.stringify(this.orderBy))
        let oldValue = copy[field]
        if (oldValue === 'ascend') {
          copy[field] = 'descend'
        } else if (oldValue === 'descend') {
          copy[field] = true
        } else {
          copy[field] = 'ascend'
        }
        this.$emit('update:orderBy', copy)
      },

      /*
       * 点击展开或者收起
       */
      expandItem(id) {
        const index = this.expandedIds.findIndex(n => n === id)
        if (index > -1) {
          this.expandedIds.splice(index, 1)
        } else {
          this.expandedIds.push(id)
        }
      },
      
      colspan(n) {
        let c = n
        if (this.checkable) {
          c++
        }
        if (this.$scopedSlots.default) {
          c++
        }
        return c
      },

      /*
       * 如果 action 存在则设置宽度
       */
      setActionWidth() {
        const { actionHeader } = this.$refs
        const firstActionDiv = this.$refs.action[0]
        const { width } = firstActionDiv.getBoundingClientRect()
        const parent = firstActionDiv.parentNode
        const style = window.getComputedStyle(parent)
        const paddingLeft = style.getPropertyValue('padding-left')
        const paddingRight = style.getPropertyValue('padding-right')
        const borderLeft = style.getPropertyValue('border-left-width')
        const borderRight = style.getPropertyValue('border-right-width')
        const width2 = width + parseInt(paddingLeft) + parseInt(paddingRight) + parseInt(borderLeft) + parseInt(borderRight)
        actionHeader.style.width = width2 + this.getScrollbarWidth() + 'px'
        console.log(actionHeader)
        this.$refs.action.map(a => {
          a.parentNode.style.width = width2 + 'px'
        })
      },
      
      /*
       * 计算滚动条宽度
       */
      getScrollbarWidth() {
        const { inner, table } = this.$refs
        const { width: innerWidth } = inner.getBoundingClientRect()
        const { width: tableWidth } = table.getBoundingClientRect()
        return innerWidth - tableWidth
      }
    },
    components: {
      Icon
    },
    beforeDestroy() {
      // window.removeEventListener('resize', this.onWindowResize)
      this.copyTable.remove()
    }
  }
</script>

<style lang="scss" scoped>
  @import '../var';
  
  $grey: darken($grey, 20%);
  .s-table-wrapper {
    position: relative;
    padding-top: 0.1px;
    
    .s-table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
      border-bottom: 1px solid $grey;
      
      &-header {
        &-inner {
          display: inline-flex; align-items: center;
          height: 100%; width: 100%;
          
          .s-table-sorter {
            display: inline-flex;
            flex-direction: column;
            margin-left: 0.2em;
            cursor: pointer;
            
            svg {
              width: 8px; height: 8px;
              fill: darken($grey, 15%);
              
              &.active {
                fill: #333;
              }
              
              &:nth-child(1) {
                position: relative;
                top: 1px;
              }
              
              &:nth-child(2) {
                position: relative;
                bottom: 1px;
              }
            }
          }
        }
      }
      
      &.bordered {
        border-top: 1px solid $grey;
        border-left: 1px solid $grey;
        border-right: 1px solid $grey;
        
        td, th {
          border: 1px solid $grey;
        }
      }
      
      &-loading {
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        z-index: 1;
        display: flex; justify-content: center; align-items: center;
        background-color: rgba(255, 255, 255, 0.7);
        
        svg {
          width: 2em; height: 2em;
          @include spin;
        }
      }
      
      td, th {
        text-align: left;
        padding: 8px;
        border-bottom: 1px solid $grey;
      }
      
      &-expand-icon {
        height: 12px; width: 12px;
        cursor: pointer;
        transform: rotate(0);
        transition: transform 0.1s linear;
        
        &.expand {
          transform: rotate(90deg);
          transition: transform 0.1s linear;
        }
      }
      
      .s-table-center {
        text-align: center;
      }
      
      &-action {
        display: inline-block;
      }
    }
    
    .s-table.compact {
      td, th {
        padding: 4px;
      }
    }
    
    .s-table.striped {
      tbody {
        > tr {
          &:nth-child(odd) {
            background-color: #fff;
          }
          
          &:nth-child(even) {
            background-color: lighten($grey, 20%);
          }
        }
      }
    }
    
    
    .s-table-copy {
      position: absolute; left: 0; top: 0;
      background-color: #fff;
    }
  }
</style>

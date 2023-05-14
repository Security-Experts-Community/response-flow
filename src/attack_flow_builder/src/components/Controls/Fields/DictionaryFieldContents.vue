<template>
  <div class="dictionary-field-contents-control">
    <div v-if="loaded">
      <div class="field-item" v-for="[key, value] in fields" :key="key">
      <p class="field-name">
        {{ titleCase(key) }}
      </p>
      <component
        class="field-value"
        :is="getField(value.type)"
        :property="value"
        @change="(...args: any) => handleUpdate(key, args)"
        @create="(...args: any) => $emit('create', ...args)"
        @delete="(...args: any) => $emit('delete', ...args)"
      />
    </div>
    </div>
    <div v-if="namespace === 'attack_flow.resource' || namespace === 'attack_flow.response'">
      <button @click="submit">{{ buttonType }}</button>
    </div> 
    
  </div>
</template>

<script lang="ts">
// Dependencies
import { defineAsyncComponent, defineComponent, PropType, ref } from "vue";
import { DictionaryProperty, Property, PropertyType, titleCase } from "@/assets/scripts/BlockDiagram";
import {mapMutations, mapState} from 'vuex';
import * as Store from "@/store/StoreTypes";
import {ErmackContent} from "@/store/StoreTypes";
// Components
import TextField from "./TextField.vue";
import ListField from "./ListField.vue";
import EnumField from "./EnumField.vue";
import NumberField from "./NumberField.vue";
import DateTimeField from "./DateTimeField.vue";
const DictionaryField = defineAsyncComponent(() => import("./DictionaryField.vue")) as any;
import App from "@/App.vue";

export default defineComponent({
  name: "DictionaryFieldContents",
  props: {
    property: {
      type: Object as PropType<DictionaryProperty>,
      required: true
    }
  },
  data() {
    return {
      iteration: ref(1),
      loaded: ref(true),
      custom: ref("")
    }
  },
  computed: {
    ...mapState("ApplicationStore", {
      context(state: Store.ApplicationStore): Store.ApplicationStore {
        return state
      }
    }),
    values(){
      return this.iteration && [...this.property.value.values()] 
    },
    namespace(){
      //@ts-ignore
      return this.property.object.template.namespace ?? ''
    },
    
    buttonType(){
      if(this.isSave){
        return 'Save'
      }

      return 'Edit'
    },
    /**
     * The set of visible properties.
     * @returns
     *  The set of visible properties.
     */
    fields(): [string, Property][] {
      this.iteration++;
      return [...this.property.value.entries()].filter(
        o => o[1].descriptor.is_visible ?? true
      );
    },
    
    isSave(): boolean {
      const [custom] = this.values as any
      return custom._value === null 
    }

  },
  methods: {
    handleUpdate(key: string, args: any){

      this.$emit('change', ...args)

      if(key === 'resource' && this.property.primaryKey === "resource"){
        if(args[0]._value){
          const value = args[0].options.value.get(args[0]._value).value.get("text")._value
          const ermakValue = this.context.ermackContent.resource.find((item: any) => item[1].text === value)
          this.custom = ermakValue[1].path
          for (const [key, value] of Object.entries(ermakValue[1].data)) {
            const item = this.property.value.get(key) ?? {}
            if('setValue' in item){

              //@ts-ignore
              item.setValue(value)
            }else{
              console.log(`field ${key} not found`)
            }
          }
        }else{
          this.property.value.forEach((value, key) => {
            // console.log(this.property.value.get(key)0)
            const item = this.property.value.get(key) ?? {}

            if('setValue' in item){
              //@ts-ignore
              item.setValue(null)
            }
          })
        }
      }

      if(key === 'action' && this.property.primaryKey === "action"){
        if(args[0]._value){
          const value = args[0].options.value.get(args[0]._value).value.get("text")._value
          const ermakValue = this.context.ermackContent.actions.find((item: any) => item[1].text === value)
          this.custom = ermakValue[1].path
          for (const [key, value] of Object.entries(ermakValue[1].data)) {
            const item = this.property.value.get(key) ?? {}
            if('setValue' in item){

              //@ts-ignore
              item.setValue(value)
            }else{
              console.log(`field ${key} not found`)
            }
          }
        }else{
          this.property.value.forEach((value, key) => {
            // console.log(this.property.value.get(key)0)
            const item = this.property.value.get(key) ?? {}

            if('setValue' in item){
              //@ts-ignore
              item.setValue(null)
            }
          })
        }
      }

      this.iteration++;
    },

    async submit(){
      if(this.isSave){

      }else{
        const skipField = ['action', 'resource']
        const data = {data: {}, path: this.custom, type: this.namespace }
        Array.from(this.property.value).forEach((item) => {
          if(!skipField.includes(item[0])){
            //@ts-ignore
            data.data[item[0]] = item[1]._value
          }
        })

        await fetch('http://localhost:3000/create', {
          method: "POST",
          body: JSON.stringify(data),
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        })
      }
    },
    /**
     * Returns a field's component type.
     * @param type
     *  The type of field.
     * @returns
     *  The field's component type.
     */
    getField(type: PropertyType): string | undefined {
      switch(type) {
        case PropertyType.String:
          return "TextField";
        case PropertyType.Int:
        case PropertyType.Float:
          return "NumberField";
        case PropertyType.Date:
          return "DateTimeField";
        case PropertyType.Enum:
          return "EnumField";
        case PropertyType.List:
          return "ListField";
        case PropertyType.Dictionary:
          return "DictionaryField";
      }
    },

    titleCase

  },
  emits: ["change", "create", "delete"],
  components: {
    TextField,
    ListField,
    EnumField,
    NumberField,
    DateTimeField,
    DictionaryField
  }
});
</script>

<style scoped>

/** === Main Field === */

.field-item {
  margin-bottom: 14px;
}

.field-item:last-child {
  margin-bottom: 0px;
}

.field-name {
  color: #a6a6a6;
  font-size: 9.5pt;
  font-weight: 500;
  margin-bottom: 6px;
}

.field-value {
  font-size: 10.5pt;
}

.text-field-control,
.enum-field-control,
.number-field-control,
.datetime-field-control {
  min-height: 30px;
  border-radius: 4px;
  background: #2e2e2e;
}

.text-field-control.disabled,
.enum-field-control.disabled,
.number-field-control.disabled,
.datetime-field-control.disabled {
  background: none;
  border: dashed 1px #404040;
}

</style>

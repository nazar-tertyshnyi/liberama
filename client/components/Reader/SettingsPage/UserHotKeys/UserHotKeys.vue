<template>
    <div class="table col column no-wrap">
        <!-- header -->
        <div class="table-row row">
            <div class="desc q-pa-sm bg-blue-2">Команда</div>
            <div class="hotKeys col q-pa-sm bg-blue-2 row no-wrap">
                <div style="width: 80px">Сочетание клавиш</div>
                <q-input ref="input" class="q-ml-sm col"
                    outlined dense rounded
                    bg-color="grey-4"
                    placeholder="Найти"
                    v-model="search"
                    @click.stop
                />
                <div v-show="!readonly" class="q-ml-sm column justify-center">
                    <q-btn class="bg-grey-4 text-grey-6" style="height: 35px; width: 35px" rounded flat icon="la la-broom" @click="defaultHotKeyAll">
                        <q-tooltip :delay="1000" anchor="top middle" self="bottom middle" content-style="font-size: 80%">
                            Установить все сочетания по умолчанию
                        </q-tooltip>
                    </q-btn>
                </div>
            </div>
        </div>

        <!-- body -->
        <div class="table-row row" v-for="(action, index) in tableData" :key="index">
            <div class="desc q-pa-sm">{{ rstore.readerActions[action] }}</div>
            <div class="hotKeys col q-pa-sm">
                <q-chip
                    :color="collisions[code] ? 'red' : 'grey-7'"
                    :removable="!readonly" :clickable="collisions[code] ? true : false"
                    text-color="white" v-for="(code, index) in value[action]" :key="index" @remove="removeCode(action, code)"
                    @click="collisionWarning(code)"
                    >
                    {{ code }}
                </q-chip>
            </div>
            <div v-show="!readonly" class="column q-pa-xs">
                <q-icon
                    name="la la-plus-circle"
                    class="button bg-green-8 text-white"
                    @click="addHotKey(action)"
                    v-ripple
                    :disabled="value[action].length >= maxCodesLength"
                >
                    <q-tooltip :delay="1000" anchor="top middle" self="bottom middle" content-style="font-size: 80%">
                        Добавить сочетание клавиш
                    </q-tooltip>
                </q-icon>
                <q-icon
                    name="la la-broom"
                    class="button text-grey-5"
                    @click="defaultHotKey(action)"
                    v-ripple
                >
                    <q-tooltip :delay="1000" anchor="top middle" self="bottom middle" content-style="font-size: 80%">
                        По умолчанию
                    </q-tooltip>
                </q-icon>
            </div>
        </div>
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import Vue from 'vue';
import Component from 'vue-class-component';

import rstore from '../../../../store/modules/reader';
//import * as utils from '../../share/utils';

const UserHotKeysProps = Vue.extend({
    props: {
        value: Object,
        readonly: Boolean,
    }
});

export default @Component({
    watch: {
        search: function() {
            this.updateTableData();
        },
        value: function() {
            this.checkCollisions();
            this.updateTableData();
        }
    },
})
class UserHotKeys extends UserHotKeysProps {
    search = '';
    rstore = {};
    tableData = [];
    collisions = {};
    maxCodesLength = 10;

    created() {
        this.rstore = rstore;
    }

    mounted() {
        this.checkCollisions();
        this.updateTableData();
    }

    get mode() {
        return this.$store.state.config.mode;
    }

    updateTableData() {
        let result = rstore.hotKeys.map(hk => hk.name).filter(name => (this.mode == 'liberama.top' || name != 'libs'));

        const search = this.search.toLowerCase();
        const codesIncludeSearch = (action) => {
            for (const code of this.value[action]) {
                if (code.toLowerCase().includes(search))
                    return true;
            }
            return false;
        };

        result = result.filter(item => {
            return !search ||
                rstore.readerActions[item].toLowerCase().includes(search) ||
                codesIncludeSearch(item)
        });

        this.tableData = result;
    }

    checkCollisions() {
        const cols = {};
        for (const [action, codes] of Object.entries(this.value)) {
            codes.forEach(code => {
                if (!cols[code])
                    cols[code] = [];
                if (cols[code].indexOf(action) < 0)
                    cols[code].push(action);
            });
        }

        const result = {};
        for (const [code, actions] of Object.entries(cols)) {
            if (actions.length > 1)
                result[code] = actions;
        }

        this.collisions = result;
    }

    collisionWarning(code) {
        if (this.collisions[code]) {
            const descs = this.collisions[code].map(action => `<b>${rstore.readerActions[action]}</b>`);
            this.$root.stdDialog.alert(`Сочетание '${code}' одновременно назначено<br>следующим командам:<br>${descs.join('<br>')}<br><br>
Возможно неожиданное поведение.`, 'Предупреждение');
        }
    }

    removeCode(action, code) {
        let codes = Array.from(this.value[action]);
        const index = codes.indexOf(code);
        if (index >= 0) {
            codes.splice(index, 1);
            const newValue = Object.assign({}, this.value, {[action]: codes});
            this.$emit('input', newValue);
        }
    }

    async addHotKey(action) {
        if (this.value[action].length >= this.maxCodesLength)
            return;
        try {
            const result = await this.$root.stdDialog.getHotKey(`Добавить сочетание для:<br><b>${rstore.readerActions[action]}</b>`, '');
            if (result) {
                let codes = Array.from(this.value[action]);
                if (codes.indexOf(result) < 0) {
                    codes.push(result);
                    const newValue = Object.assign({}, this.value, {[action]: codes});
                    this.$emit('input', newValue);
                    this.$nextTick(() => {
                        this.collisionWarning(result);
                    });
                }
            }
        } catch (e) {
            //
        }
    }

    async defaultHotKey(action) {
        try {
            if (await this.$root.stdDialog.confirm(`Подтвердите сброс сочетаний клавиш<br>в значения по умолчанию для команды:<br><b>${rstore.readerActions[action]}</b>`, ' ')) {
                const codes = Array.from(rstore.settingDefaults.userHotKeys[action]);
                const newValue = Object.assign({}, this.value, {[action]: codes});
                this.$emit('input', newValue);
            }
        } catch (e) {
            //
        }
    }

    async defaultHotKeyAll() {
        try {
            if (await this.$root.stdDialog.confirm('Подтвердите сброс сочетаний клавиш<br>для ВСЕХ команд в значения по умолчанию:', ' ')) {
                const newValue = Object.assign({}, rstore.settingDefaults.userHotKeys);
                this.$emit('input', newValue);
            }
        } catch (e) {
            //
        }
    }
}
//-----------------------------------------------------------------------------
</script>

<style scoped>
.table {
    border-left: 1px solid grey;
    border-top: 1px solid grey;
}

.table-row {
    border-right: 1px solid grey;
    border-bottom: 1px solid grey;
}

.table-row:nth-child(even) {
    background-color: #f7f7f7;
}

.table-row:hover {
    background-color: #f0f0f0;
}

.desc {
    width: 130px;
    overflow-wrap: break-word;
    word-wrap: break-word;
    white-space: normal;
}

.hotKeys {
    border-left: 1px solid grey;    
}

.button {
    font-size: 25px;
    border-radius: 25px;
    cursor: pointer;
}
</style>
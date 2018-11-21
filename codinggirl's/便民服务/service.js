/**
便民服务
*/

const productClass = require('../_service/productClass')
const ObjectId = require('mongodb').ObjectId
const moment = require('moment-timezone')
const todayService = require('../../service/todayService')

module.exports = {

    main: async function (ctx, next) {
        var date = moment().tz('Asia/Shanghai').format('YYYY-MM-DD')
        var itemList = await ctx.db.collection('便民服务').find({
            '日期': date
        }).toArray()
        ctx.hepPug.view('main', {
            itemList: itemList,
            todayDate: todayService.todayDateString()
        })
    },
    
    add: async function add(ctx) {
        let productClassList = await productClass(ctx)
        let todayDate = moment().tz('Asia/Shanghai').format('YYYY-MM-DD')
        ctx.hepPug.view('add', {
            productClassList: productClassList,
            todayDate: todayDate
        })
    },
    
    edit: async function edit(ctx) {
        let id = ctx.query.id
        if (!id) {
            ctx.status = 404
            return
        }
        let info = await ctx.db.collection('便民服务').findOne({
            _id: ObjectId(id)
        })
        if (!info) {
            ctx.body = '该项目不存在'
            return
        }
        let productClassList = await productClass(ctx)
        ctx.hepPug.view('edit', {
            info: info,
            productClassList: productClassList
        }) 
    },
    
    saveAdd: async function (ctx) {
        var body = ctx.request.body
        // 站点id、站点编号
        var siteId = ObjectId(ctx.state.siteInfo._id) || null
        var siteCode = ctx.state.siteInfo['编号']
        // 小类信息
        var smallClassId = body['服务内容']
        var smallClassInfo = await ctx.db.collection('服务内容类型').findOne({
            _id: ObjectId(smallClassId)
        })
        
        var params = {
            '站点id': siteId,
            '站点编号': siteCode,
            '服务对象类型': body['类型'],
            '联系电话': body['联系电话'],
            '服务内容': smallClassInfo,
            '金额（元）': body['商品名称'],
            '办理日期': body['日期'],
            '服务人员': body['服务人员'],
            '意见反馈': body['意见反馈'],
            '审核状态': '待审核'
        }
        try {
            ctx.db.collection('便民服务').insertOne(params)
            ctx.body = {
                success: true,
                msg: '添加成功'
            }
        } catch (e) {
            console.log(e.stack)
            ctx.body = {
                success: false,
                msg: '添加失败'
            }
        }
    },
    
    saveEdit: async function (ctx) {
        var body = ctx.request.body
        var id = ObjectId(body._id)
        // 小类信息
        var smallClassId = body['服务内容']
        var smallClassInfo = await ctx.db.collection('服务内容类型').findOne({
            _id: ObjectId(smallClassId)
        })

        var params = {
            '服务对象类型': body['类型'],
            '联系电话': body['联系电话'],
            '服务内容': smallClassInfo,
            '金额（元）': body['商品名称'],
            '办理日期': body['日期'],
            '服务人员': body['服务人员'],
            '意见反馈': body['意见反馈'],
            '审核状态': '待审核'
        }
        try {
            ctx.db.collection('便民服务').updateOne({
                _id: id
            }, {
                $set: params
            })
            ctx.body = {
                success: true,
                msg: '修改成功'
            }
        } catch (e) {
            console.log(e.stack)
            ctx.body = {
                success: false,
                msg: '修改失败'
            }
        }
    },
    
    saveRemove: async function (ctx) {
        let body = ctx.request.body
        let id = body.id
        if (!id) {
            ctx.body = {
                success: false,
                msg: '请选择要删除的内容'
            }
            return
        }
        try {
            ctx.db.collection('便民服务').removeOne({
                _id: ObjectId(id)
            })
            ctx.body = {
                success: true,
                msg: '删除成功'
            }
        } catch (e) {
            console.log(e.stack)
            ctx.body = {
                success: false,
                msg: '删除失败'
            }
        }
    },
    
    exportCsv: async function (ctx) {
        // 起始日期
        let s = ctx.query.s
        // 截止日期
        let e = ctx.query.e
        
    }
}

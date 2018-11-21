'use strict';

const Excel = require('exceljs')
const dateStringBetween = require('../../service/dateStringService')
const moment = require('moment-timezone')
const config = require('config')
const path = require('path')
const uuidv4 = require('uuid/v4')
const fs = require('fs')

/**
 * 导出代购代销数据到 Excel 文件
 *
 * 程序从数据库获取到数据，并将其生成 Excel 文件，供浏览器下载
 *
 * >>>
 * 该模块为 async 函数模块。
 * @namespace 站点/代购代销
 * @module 站点/代购代销 buySellDataToExcel
 * @param ctx {ctx} Koa ctx
 * @param startDate {String} 起始日期，导出数据的起始日期
 * @param endDate {String} 截止日期，导出数据的截止日期
 * @return none
 */
module.exports = async function toExcel(ctx, startDate, endDate) {
    let siteName = ctx.state.siteInfo['名称']
    let siteCode = ctx.state.siteInfo['编号']

    let workbook = new Excel.Workbook()

    // 工作薄属性
    workbook.creator = 'LibreRose SmartBot (Excel Export)'
    workbook.lastModifiedBy = 'LibreRose SmartBot (Excel Export)'
    workbook.created = new Date()
    workbook.modified = new Date()
    workbook.lastPrinted = new Date()

    // 说明表
    let dateStringList = dateStringBetween(startDate, endDate)
    {
        var readMeSheet = workbook.addWorksheet('数据导出说明')

        let a1 = readMeSheet.getCell('A1')
        a1.value = `${siteName}(${siteCode}) 代购代销数据表`
        a1.alignment = {
            horizontal: 'center'
        }

        let a2 = readMeSheet.getCell('A2')
        a2.value = '导出说明'
        a2.alignment = {
            horizontal: 'center'
        }

        let readMeText = '导出的数据存放于工作表中，每天的数据存放于以该天日期命名的工作表中。\r\n如果当天没有数据，则不会生成相应的工作表。\r\n请打开工作表进行查看数据。\r\n'
        let a3 = readMeSheet.getCell('A3')
        a3.value = readMeText
        a3.alignment = {
            wrapText: true
        }

        let col = readMeSheet.getColumn(1)
        col.width = 66
    }

    // 数据表
    for (var i = 0; i < dateStringList.length; i++) {
        // 日期字符串 `YYYY-MM-DD`
        let dateString = dateStringList[i]

        // 数据
        let data = await ctx.db.collection('代购代销').find({
            '日期': dateString
        }).toArray()
        let total = data.length
        // 没有数据的日期不生成数据表
        if (total === 0) {
            continue
        }

        // 数据预处理
        {
            data.forEach(function (item) {
                let sc = item['商品小类']
                if (!sc) {
                    return
                }
                item['商品小类名称'] = sc['名称']
                item['代买编码'] = sc['代买编码']
                item['代卖编码'] = sc['代卖编码']
            })
        }

        // 数据表
        var sheet = workbook.addWorksheet(dateString, {
            views: {
                state: 'frozen',
                xSplit: 2,
                ySplit: 3
            }
        })

        // 表头（第1行）
        {
            sheet.mergeCells('A1:S1')

            let a1 = sheet.getCell('A1')
            a1.font = {
                name: '微软雅黑',
                size: 18
            }
            a1.alignment = {
                horizontal: 'center'
            }
            a1.value = `${siteName}(${siteCode}) ${dateString} 代购代销数据表`
        }

        // 导出日期（第2行）
        let now = moment().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')
        sheet.mergeCells('A2:S2')
        let b2 = sheet.getCell('A2')
        b2.alignment = {
            horizontal: 'right'
        }
        b2.value = `本数据由站点系统导出。导出时间：${now}`

        // 列属性
        let colsProp = [
            // _id
            { header: '_id', key: '_id', width: 24 },
            // 站点id
            { header: '站点id', key: '站点id', width: 24 },
            // 站点编号
            { header: '站点编号', key: '站点编号', width: 8 },
            // 类型
            { header: '类型', key: '类型', width: 4 },
            // 商品小类名称
            { header: '商品小类名称', key: '商品小类名称', width: 10 },
            // 代买编码
            { header: '代买编码', key: '代买编码', width: 8 },
            // 代卖编码
            { header: '代卖编码', key: '代卖编码', width: 8 },
            // 商品名称
            { header: '商品名称', key: '商品名称', width: 20 },
            // 支付方式
            { header: '支付方式', key: '支付方式', width: 8 },
            // 数量
            { header: '数量', key: '数量', width: 8 },
            // 单价
            { header: '单价', key: '单价', width: 8 },
            // 合计
            { header: '合计', key: '合计', width: 8 },
            // 货运单号
            { header: '货运单号', key: '货运单号', width: 10 },
            // 姓名
            { header: '姓名', key: '姓名', width: 6 },
            // 电话
            { header: '电话', key: '电话', width: 10 },
            // 邮寄地址
            { header: '邮寄地址', key: '邮寄地址', width: 20 },
            // 服务人员
            { header: '服务人员', key: '服务人员', width: 6 },
            // 日期
            { header: '日期', key: '日期', width: 10 },
            // 是否贫困户
            { header: '是否贫困户', key: '是否贫困户', width: 10 }
        ]

        // 标题行（第3行）
        let b = sheet.getRow(3)
        let titles = []
        colsProp.forEach(function (item) {
            titles.push(item.header)
            item.header = undefined
        })
        b.font = {
            bold: true
        }
        b.values = titles

        // 列属性
        sheet.columns = colsProp

        // 展示数据（从第4行开始）
        sheet.addRows(data)
    }

    // 写文件
    let tempPath = config.excelExportTempPath
    if (!tempPath) {
        console.log('服务器配置错误，无法进行导出操作。')
        ctx.body = '服务器配置错误，无法进行导出操作。'
        return
    }
    let fileName = `${uuidv4()}.xlsx`
    let fullPath = path.resolve(path.join(tempPath, fileName))
    await workbook.xlsx.writeFile(fullPath)

    // 浏览器下载
    ctx.body = fs.createReadStream(fullPath)
    let readableFileName = `${siteName}(${siteCode}) 代购代销数据表(${startDate} - ${endDate}).xlsx`
    ctx.attachment(readableFileName)
}

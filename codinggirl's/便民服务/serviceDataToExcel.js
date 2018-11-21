'use strict';

const Excel = require('exceljs')
const dateStringBetween = require('../../service/dateStringService')
const moment = require('moment-timezone')
const config = require('config')
const path = require('path')
const uuidv4 = require('uuid/v4')
const fs = require('fs')

/**
 * 导出便民服务数据到 Excel 文件
 *
 * 程序从数据库获取到数据，并将其生成 Excel 文件，供浏览器下载
 *
 * >>>
 * 该模块为 async 函数模块。
 * @namespace 站点/便民服务
 * @module 站点/便民服务 buySellDataToExcel
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
        a1.value = `${siteName}(${siteCode}) 便民服务数据表`
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
        let data = await ctx.db.collection('便民服务').find({
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
                let sc = item['服务对象']
                if (!sc) {
                    return
                }
                item['是否贫困户'] = sc['名称']
                item['贫困户'] = sc['贫困户']
                item['非贫户'] = sc['非贫户']
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
            a1.value = `${siteName}(${siteCode}) ${dateString} 便民服务数据表`
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
            // 序号
            { header: '序号', key: '序号', width: 10 },
            // 服务对象
            { header: '服务对象', key: '服务对象', width: 10 },
            // 联系电话
            { header: '联系电话', key: '联系电话', width: 10 },
            // 服务内容
            { header: '服务内容', key: '服务内容', width: 10 },
            // 金额（元）
            { header: '金额（元）', key: '金额（元）', width: 20 },
            // 办理时间
            { header: '办理时间', key: '办理时间', width: 10 },
            // 服务人员
            { header: '服务人员', key: '服务人员', width: 6 },
            // 意见反馈
            { header: '意见反馈', key: '意见反馈', width: 20 },
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
    let readableFileName = `${siteName}(${siteCode}) 便民服务数据表(${startDate} - ${endDate}).xlsx`
    ctx.attachment(readableFileName)
}

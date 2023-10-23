"use strict";

import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import * as d3 from "d3";


export class Visual implements IVisual {
    private svg: d3.Selection<SVGElement, any, any, any>;
    private axisX: d3.Selection<SVGElement, any, any, any>;
    private axisY: d3.Selection<SVGElement, any, any, any>;
    private barContainer: d3.Selection<SVGElement, any, any, any>;
    private label: d3.Selection<SVGElement, any, any, any>;
    private div: d3.Selection<HTMLElement, any, any, any>;
    private p: d3.Selection<HTMLElement, any, any, any>;
    private platnosci: d3.Selection<HTMLElement, any, any, any>;
    private baza: d3.Selection<HTMLElement, any, any, any>;
    private plan: d3.Selection<HTMLElement, any, any, any>;
    private umowa: d3.Selection<HTMLElement, any, any, any>;
    private line: d3.Selection<SVGElement, any, any, any>;

    constructor(options: VisualConstructorOptions) {
        this.svg = d3.select(options.element).append('svg');
        this.barContainer = this.svg.append('g');
        this.axisX = this.svg.append('g');
        this.axisY = this.svg.append('g');
        this.label = this.svg.append('g');
        this.div = d3.select(options.element).append('div');
        this.line = this.svg.append('g');
        d3.formatDefaultLocale({
            "decimal": ",",
            "thousands": " ",
            "grouping": [3],
            "currency": ["zł", ""]});
        d3.timeFormatDefaultLocale({
            "dateTime": "%d.%m.%Y",
            "date": "%d.%m.%Y",
            "time": "%H:%M:%S",
            "periods": ["AM", "PM"],
            "days": ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"],
            "shortDays": ["Nd", "Pon", "Wt", "Śr", "Czw", "Pt", "Sob"],
            "months": ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"],
            "shortMonths": ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"]
          });

        /////////// SHADOW ////////////
        const defs = this.barContainer.append("defs");
        let filter = defs.append("filter")
        .attr("id", "dropshadow")
        //Create blur effect
        filter.append("feGaussianBlur")
            .attr("in", "SourceAlpha") // Create blur effect acrossborder, SourceGraphic
            .attr("stdDeviation", 5) // Amount of blur
            .attr("result", "blur");
        //Drop Shadow - Intensity and direction of shadow
        filter.append("feOffset")
            .attr("in", "blur")
            .attr("dx", 0)
            .attr("dy", 0)
            .attr("result", "offsetBlur");
        let feMerge = filter.append("feBlend")
        .attr("in", "SourceGraphic")
        .attr("in2", "blurOut")
        .attr("mode", "normal")
        ////////////////////////////////
        this.div.classed('kpi', true)
        this.div.append('p').text('DANE FINANSOWE').classed('tytul', true)
        this.p=this.div.append('p').text('PROGNOZA UMOWY: ').classed('label_platnosci', true)
        this.umowa=this.p.append('span')
        this.p=this.div.append('p').text('PŁATNOŚCI: ').classed('label_platnosci', true)
        this.platnosci=this.p.append('span')
        this.p=this.div.append('p').text('BAZA: ').classed('label_tytul', true)
        this.baza=this.p.append('span')
        this.p=this.div.append('p').text('PLAN zeszły mc: ').classed('label_tytul', true)
        this.plan=this.p.append('span')

    };
    

    public update(options: VisualUpdateOptions) {
        const margins = {top: 9, right: 60, bottom: 20, left: 70};
        const width = options.viewport.width;
        const heightMax = options.viewport.height;
        const height = heightMax/2;


        ////////////////// POBÓR DANYCH //////////////////
        let extractedData = [];
        let kpiData = {};
        if (options.dataViews 
            && options.dataViews[0]
            && options.dataViews[0].categorical
            && options.dataViews[0].categorical.categories
            && options.dataViews[0].categorical.values){

            const categorialData = options.dataViews[0].categorical;
            const category = categorialData.categories[0];
            const dataValue= categorialData.values;           
            for (let i = 0; i < category.values.length; i++) {
                const dictValue = {category: "RZECZOWE"}; // słownik danych dla danej categori / firmy
                for (let j = 0; j<dataValue.length; j++){
                    if (j<3){
                        let nameValue = Object.keys(categorialData.values[j].source.roles)[0]; // nazwa danych
                        dictValue[nameValue] = dataValue[j].values[i];      // zapis danych do słownika
                    } else {
                        let nameValue = Object.keys(categorialData.values[j].source.roles)[0]; // nazwa danych
                        kpiData[nameValue] = dataValue[j].values[i];      // zapis danych do słownika
                    }
                };
                extractedData.push(dictValue);
            };
        };
      
        ///////////////////////// OBLICZENIA /////////////////////
        extractedData.push({category: "FINANSOWE", proc_rzecz_baza: Math.round(kpiData['plat_baza']/kpiData['umowa']*1000)/1000, proc_rzecz_real:Math.round(kpiData['plat_real']/kpiData['umowa']*1000)/1000})
        extractedData[1]['przyrost_rzecz'] = extractedData[1]['proc_rzecz_real']-Math.round(kpiData['plat_mc']/kpiData['umowa']*1000)/1000
        // console.log(extractedData, kpiData)

        ////////////////// FUNKCJE RYSUJĄCE ////////////////////////
        function recting (data, x, y, barContainer, className, widthPoint, xPoint, style? , ifShadow?) {
            // DEFINOWANIE BARSÓW
            const barx = barContainer
            .selectAll('rect.'+className)
            .data(data)
            ;
            // TWORZENIE BARSÓW
            barx.enter()
                .append('rect')
                .classed(className, true)
                .attr('height', y.bandwidth()) // szerokość baru
                .attr('width', widthPoint)
                .attr('y', dataPoint => y(dataPoint.category)) // zaczynamy od jakiego punktu y
                .attr('x', xPoint) // zaczynamy od jakiego punktu x
                .attr('style',style)
                .attr("filter", ifShadow ? "url(#dropshadow)": "")
                ;

            // POWTÓZENIE PRZY ODŚWIEŻENIU zmiana szerokości, wysokości okienek
            barx
                .attr('height', y.bandwidth())
                .attr('width', widthPoint)
                .attr('y', dataPoint => y(dataPoint.category))
                .attr('x', xPoint)
                .attr('style',style)
                .attr("filter", ifShadow ? "url(#dropshadow)": "");
                ;
            barx.exit().remove();
            return barx;
        };

        function labeling (data, labelContainer, className, text, xPoint, yPoint, fill? ) {
            const labelx = labelContainer
                .selectAll("text."+className)
                .data(data)
                ;
            labelx.enter()
                .append('text')
                .html(text)
                .classed(className, true)
                .attr("x", xPoint)
                .attr("y", yPoint)
                .attr("dy", ".36em")
                .attr('fill', fill) // tylko dla opisu zmienia ale .less nadpisuje kolor w pozostałych
            ;
            // POWTÓZENIE PRZY ODŚWIEŻENIU zmiana szerokości, wysokości okienek
            labelx
                .html(text)
                .attr("x", xPoint)
                .attr("y", yPoint)
                .attr("dy", ".36em")
                .attr('fill', fill)
            ;
            labelx.exit().remove();
            return labelx;
        };

        function lineing (data, lineContainer, className, x1, y1, x2, y2) {
            const linex = lineContainer
                .selectAll('line.'+className)
                .data(data)
                ;
            linex.enter()
                .append('line')
                .classed(className, true)
                .attr('x1', x1)
                .attr('y1', y1)
                .attr('x2', x2)
                .attr('y2', y2)
                ;
            // Powtórzenie
            linex.attr('x1', x1)
                .attr('y1', y1)
                .attr('x2', x2)
                .attr('y2', y2)
                ;
            linex.exit().remove();
            return linex;
        };
        function formatCurrency(num) {
            const format = d3.format(".2s")
            let val = format(num)
            if(val.slice(-1)=="M"){
                return val = val.slice(0,-1)+" mln"
            } else if (val.slice(-1)=="k") {
                return val = val.slice(0,-1)+" tyś"
            } else if (val.slice(-1)=="G") {
                return val = val.slice(0,-1)+" mld"
            } else {
                return val
            }
        };
        

        //////////////// USTAWIANIE SKALI OSI DLA X i Y  /////////////////////////
        const formatProc = d3.format(".1%");

        // Zakres osi X
        // const rangeX = d3.range(0, 1.05, 0.25);
        const y = d3.scaleBand()
            .domain(extractedData.map(dataPoint => dataPoint.category))
            .rangeRound([margins.top,height-margins.bottom])
            .padding(0.4)
            ;

        const x = d3.scaleTime()
            .domain([0, 1])
            .range([margins.left, width-margins.left])
            ;
        
        // USTAWIANIE OSI Y
        const yAxis = d3.axisLeft(y).tickSize(0);
        this.axisY.call(yAxis)
            .attr('transform', `translate(${margins.left},0)`)
            .selectAll(".tick text")
            ;

        // // USTAWIANIE OSI X
        // const xAxis = d3.axisBottom(x)
        // xAxis.tickValues(rangeX)
        //      .tickFormat(d3.format(".0%")) // format
        //      .tickSizeOuter(0)
        //      ;
        
        // this.axisX.call(xAxis)
        //     .attr('transform', `translate(0,${height-margins.bottom})`)
        //     .classed("xAxis", true)
        //     .style("text-anchor", "start")
        //     .attr('opacity', 0.6)
        // ;


        ////////////// OBSZAR ROBOCZY WYKRESU ////////////////
        this.svg.attr('width', width).attr('height', height)
        ;

        ///////// BAZA ////////////////
        // LINE
        const bazaLine = lineing(extractedData, this.line, 'line_baza', d => x(d.proc_rzecz_baza), d => y(d.category),
        d => x(d.proc_rzecz_baza), d => y(d.category)+y.bandwidth());
        // LABEL
        const labelBaza = labeling(extractedData, this.line, 'label_baza', 
        d => `<tspan dx=0em dy=-0.4em> ${formatProc(d.proc_rzecz_baza)}</tspan>`,
        d => x(d.proc_rzecz_baza),
        d => y(d.category)
        );

        // 100%
        // BAR
        const barStatus = recting(extractedData, x, y, this.barContainer, 'bar_100',
        d => x(1)-margins.left,    
        x(0),
        '',
        true,
            );
        //////////// WYKONANIE //////////////////
        // BAR
        const barWykonanie = recting(extractedData, x, y, this.barContainer, 'bar_wykonanie',
            d => x(d.proc_rzecz_real)-margins.left,    
            x(0),
            d => d.proc_rzecz_baza>d.proc_rzecz_real ? 'fill:red;opacity:0.8;':'fill:#00b000;opacity:0.8;',
            false,
        );
        // LABEL
        const labelWykonanie = labeling(extractedData, this.label, 'label_wykonanie', 
            d => `<tspan dx=0.6em dy=-0.1em> ${formatProc(d.proc_rzecz_real)}</tspan>`
                +`<tspan dx=0.8em x=${x(d.proc_rzecz_real)} dy=1em style="font-size: 0.7em">△ ${formatProc(d.przyrost_rzecz)} </tspan>`
            ,
            d => x(d.proc_rzecz_real),
            d => y(d.category)+y.bandwidth()/2,
            d => d.proc_rzecz_baza>d.proc_rzecz_real ? 'red':'green'
        );




        // KPI     
        this.umowa.text(formatCurrency(kpiData['umowa']))
        this.platnosci.text(formatCurrency(kpiData['plat_real']))
        // this.platnosci.style('color', 'rgb(255,93,35)')
        this.baza.text(`${formatCurrency(kpiData['plat_baza'])} (${formatCurrency(kpiData['plat_real']-kpiData['plat_baza'])} ${formatProc(extractedData[1]['proc_rzecz_real']-extractedData[1]['proc_rzecz_baza'])})`)
        this.baza.style('color', kpiData['plat_baza']>kpiData['plat_real']? 'red': 'green')
        this.plan.text(kpiData['plan_mc']?`${formatCurrency(kpiData['plan_mc'])} (${formatCurrency(kpiData['plat_real']-kpiData['plan_mc'])} ${formatProc((kpiData['plat_real']-kpiData['plan_mc'])/kpiData['plan_mc'])})`:'brak planu')
        this.plan.style('color', kpiData['plan_mc']? (kpiData['plan_mc']>kpiData['plat_real']? 'red': 'green') : '')
        
    };



};


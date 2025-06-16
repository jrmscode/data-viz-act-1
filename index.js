document.addEventListener("DOMContentLoaded", () => {
  // ================================
  // Configuración general y definición del tooltip
  // ================================
//   const margin = { top: 20, right: 60, bottom: 80, left: 100 };
  const margin = { top: 20, right: 20, bottom: 80, left: 40 };
  const containerWidth = document.querySelector(".chart-container").clientWidth;
  const width = containerWidth - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;
  const tooltip = d3.select("#tooltip");

  // Escala ordinal (para barras, treemap, etc.)
  const colorScaleOrdinal = d3
    .scaleOrdinal()
    .range(["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"]);

  // -------------------------------
  // Cargar el CSV y generar gráficos (excepto el mapa)
  // -------------------------------
  d3.csv("./data/sales.csv")
    .then((data) => {
      // A) Gráfico de Barras: Total de Ventas por Categoría
      const categoryData = d3.rollup(
        data,
        (v) => d3.sum(v, (d) => +d.sales),
        (d) => d.category
      );
      const chartData = Array.from(categoryData, ([category, totalSales]) => ({
        category,
        totalSales,
        formattedSales: totalSales.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
        }),
      })).sort((a, b) => b.totalSales - a.totalSales);

      const svg = d3
        .select("#bar-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const xScale = d3
        .scaleBand()
        .range([0, width])
        .domain(chartData.map((d) => d.category))
        .padding(0.2);

      const yScale = d3
        .scaleLinear()
        .range([height, 0])
        .domain([0, d3.max(chartData, (d) => d.totalSales)]);

      // Líneas de cuadrícula
      svg
        .selectAll(".grid-line")
        .data(yScale.ticks(5))
        .enter()
        .append("line")
        .attr("class", "grid-line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", (d) => yScale(d))
        .attr("y2", (d) => yScale(d));

      // Eje X
      svg
        .append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", "bold");

      // Eje Y
      svg
        .append("g")
        .call(
          d3
            .axisLeft(yScale)
            .ticks(5)
            .tickFormat((d) => d3.format(".2s")(d))
        )
        .selectAll("text")
        .style("font-size", "12px");

      // Etiquetas de eje
      svg
        .append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - height / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Total de Ventas ($)");

      svg
        .append("text")
        .attr("class", "axis-label")
        .attr(
          "transform",
          `translate(${width / 2}, ${height + margin.bottom - 20})`
        )
        .style("text-anchor", "middle")
        .text("Categoría de Producto");

      // Crear barras
      svg
        .selectAll(".bar")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => xScale(d.category))
        .attr("width", xScale.bandwidth())
        .attr("y", height) // Para animación (desde abajo)
        .attr("height", 0) // Inicia en 0 para animar
        .attr("fill", (d, i) => colorScaleOrdinal(i))
        .attr("rx", 4)
        .on("mouseover", function (event, d) {
          d3.select(this).transition().duration(200).attr("opacity", 0.8);
          tooltip
            .style("opacity", 1)
            .html(
              `<strong>${d.category}</strong><br>
                    Total Sales: ${d.formattedSales}<br>
                    Percentage: ${(
                      (d.totalSales / d3.sum(chartData, (d) => d.totalSales)) *
                      100
                    ).toFixed(1)}%`
            )
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 10 + "px");
        })
        .on("mouseout", function () {
          d3.select(this).transition().duration(200).attr("opacity", 1);
          tooltip.style("opacity", 0);
        });

      svg
        .selectAll(".bar")
        .transition()
        .duration(1000)
        .delay((d, i) => i * 200)
        .attr("y", (d) => yScale(d.totalSales))
        .attr("height", (d) => height - yScale(d.totalSales));

      svg
        .selectAll(".value-label")
        .data(chartData)
        .enter()
        .append("text")
        .attr("class", "value-label")
        .attr("x", (d) => xScale(d.category) + xScale.bandwidth() / 2)
        .attr("y", (d) => yScale(d.totalSales) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .style("opacity", 0)
        .text((d) => d3.format(".2s")(d.totalSales))
        .transition()
        .duration(1000)
        .delay((d, i) => i * 200 + 500)
        .style("opacity", 1);

      // B) Gráfico de Línea: Tendencia de Ventas en el Tiempo
      const parseDate = d3.timeParse("%Y-%m-%d");
      const salesByMonth = d3.rollup(
        data,
        (v) => d3.sum(v, (d) => +d.sales),
        (d) => {
          const date = parseDate(d.order_date);
          return d3.timeMonth(date);
        }
      );
      const salesTimeData = Array.from(salesByMonth, ([date, totalSales]) => ({
        date,
        totalSales,
      })).sort((a, b) => a.date - b.date);

      const lineMargin = { top: 20, right: 20, bottom: 80, left: 40 };
      const lineWidth = containerWidth - lineMargin.left - lineMargin.right;
      const lineHeight = 400 - lineMargin.top - lineMargin.bottom;

      const lineSvg = d3
        .select("#line-chart")
        .attr("width", lineWidth + lineMargin.left + lineMargin.right)
        .attr("height", lineHeight + lineMargin.top + lineMargin.bottom)
        .append("g")
        .attr("transform", `translate(${lineMargin.left},${lineMargin.top})`);

      const xLineScale = d3
        .scaleTime()
        .domain(d3.extent(salesTimeData, (d) => d.date))
        .range([0, lineWidth]);
      const yLineScale = d3
        .scaleLinear()
        .domain([0, d3.max(salesTimeData, (d) => d.totalSales)])
        .range([lineHeight, 0]);

      lineSvg
        .append("g")
        .attr("transform", `translate(0,${lineHeight})`)
        .call(
          d3
            .axisBottom(xLineScale)
            .ticks(d3.timeMonth.every(1))
            .tickFormat(d3.timeFormat("%b %Y"))
        )
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)");

      lineSvg
        .append("g")
        .call(d3.axisLeft(yLineScale).ticks(5).tickFormat(d3.format(".2s")));

      lineSvg
        .append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - lineMargin.left)
        .attr("x", 0 - lineHeight / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "18px")
        .text("Total de Ventas ($)");

      lineSvg
        .append("text")
        .attr("class", "axis-label")
        .attr(
          "transform",
          `translate(${lineWidth / 2}, ${lineHeight + lineMargin.bottom - 5})`
        )
        .style("text-anchor", "middle")
        .style("font-size", "18px")
        .text("Fecha");

      const linePath = lineSvg
        .append("path")
        .datum(salesTimeData)
        .attr("fill", "none")
        .attr("stroke", "#FF6B6B")
        .attr("stroke-width", 2)
        .attr(
          "d",
          d3
            .line()
            .x((d) => xLineScale(d.date))
            .y((d) => yLineScale(d.totalSales))
        )
        .attr("stroke-dasharray", function () {
          const totalLength = this.getTotalLength();
          return totalLength + " " + totalLength;
        })
        .attr("stroke-dashoffset", function () {
          return this.getTotalLength();
        })
        .transition()
        .duration(4000)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);

      lineSvg
        .selectAll(".dot")
        .data(salesTimeData)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", (d) => xLineScale(d.date))
        .attr("cy", (d) => yLineScale(d.totalSales))
        .attr("r", 3)
        .attr("fill", "#FF6B6B")
        .on("mouseover", function (event, d) {
          tooltip
            .style("opacity", 1)
            .html(
              `Date: ${d3.timeFormat("%B %Y")(d.date)}<br>
                        Sales: ${d3.format("$,.2f")(d.totalSales)}`
            )
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 10 + "px");
        })
        .on("mouseout", function () {
          tooltip.style("opacity", 0);
        });

      // (Aquí podrías incluir otras visualizaciones que también trabajen solo con el CSV,
      // como el treemap o el gráfico horizontal de productos)

      // -------------------------------
      // Al finalizar el procesamiento del CSV, encadenamos la carga del GeoJSON para el mapa
      // Se devuelve el CSV (ya procesado) como Promise.resolve y se carga el GeoJSON
      return Promise.all([
        Promise.resolve(data),
        d3.json(
          "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
        ),
      ]);
    })
    .then(([data, world]) => {
      // C) Mapa: Total de Ventas por País
      // Agrupar las ventas por país usando los datos ya cargados
      const salesByCountry = d3.rollup(
        data,
        (v) => d3.sum(v, (d) => +d.sales),
        (d) => d.country
      );
      const salesData = Array.from(salesByCountry, ([country, totalSales]) => ({
        country,
        totalSales,
      }));

      // Usamos una escala secuencial para mapear de 0 al máximo de ventas
      const maxSalesMap = d3.max(salesData, (d) => d.totalSales);
      const mapColorScale = d3
        .scaleSequential(d3.interpolateBlues)
        .domain([0, maxSalesMap]);

      const mapMargin = { top: 20, right: 20, bottom: 80, left: 40 };
      const mapWidth = containerWidth - mapMargin.left - mapMargin.right;
      const mapHeight = 400 - mapMargin.top - mapMargin.bottom;

      const mapSvg = d3
        .select("#map-chart")
        .attr("width", mapWidth + mapMargin.left + mapMargin.right)
        .attr("height", mapHeight + mapMargin.top + mapMargin.bottom)
        .append("g")
        .attr("transform", `translate(${mapMargin.left},${mapMargin.top})`);
        // .attr("transform", "translate(20,30)");

      // Leyenda para el mapa
      const legendHeight = 200,
        legendWidth = 25,
        legendY = 20;
        const legendX = 20;
    //   const legendX = mapWidth - 40;

      // Ajusta el tamaño y posición de la leyenda
    //   const legendHeight = 150,
    //   legendWidth = 20;
      // Le restamos 20px de margen desde el borde
    //   const legendX = mapWidth - legendWidth - 20;
    //   const legendY = mapHeight - legendHeight - 20;

      const gradient = mapSvg
        .append("defs")
        .append("linearGradient")
        .attr("id", "colorGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");
      [0, 0.25, 0.5, 0.75, 1].forEach((stop) => {
        gradient
          .append("stop")
          .attr("offset", `${stop * 100}%`)
          .attr("stop-color", d3.interpolateBlues(1 - stop));
      });
      mapSvg
        .append("rect")
        .attr("x", legendX)
        .attr("y", legendY)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#colorGradient)")
        .style("stroke", "#333")
        .style("stroke-width", 1);
      const legendScale = d3
        .scaleLinear()
        .domain([0, maxSalesMap])
        .range([legendHeight, 0]);
      const legendAxis = d3
        .axisRight(legendScale)
        .ticks(5)
        .tickFormat(d3.format("$.2s"));
      mapSvg
        .append("g")
        .attr("transform", `translate(${legendX + legendWidth},${legendY})`)
        .call(legendAxis)
        .selectAll("text")
        .style("font-size", "10px");
      mapSvg
        .append("text")
        .attr("x", legendX)
        .attr("y", legendY - 5)
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Ventas");

      // Proyección y generación del path
      const projection = d3
        .geoMercator()
        .scale(100)
        .translate([mapWidth / 2, mapHeight / 1.5]);
      const path = d3.geoPath().projection(projection);

      // Agregar comportamiento de zoom
      const zoom = d3
        .zoom()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
          mapSvg.selectAll("path").attr("transform", event.transform);
        });

      d3.select("#map-chart").call(zoom);

      // Dibujar el mapa
      mapSvg
        .selectAll("path")
        .data(world.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", (d) => {
          const countryData = salesData.find(
            (c) => c.country === d.properties.name
          );
          return countryData ? mapColorScale(countryData.totalSales) : "#ccc";
        })
        .style("stroke", "#333")
        .style("stroke-width", 0.5)
        .on("mouseover", function (event, d) {
          const countryData = salesData.find(
            (c) => c.country === d.properties.name
          );
          tooltip
            .style("opacity", 1)
            .html(
              `Country: ${d.properties.name}<br>
                    Sales: ${
                      countryData
                        ? d3.format("$,.2f")(countryData.totalSales)
                        : "No data"
                    }`
            )
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 10 + "px");
        })
        .on("mouseout", function () {
          tooltip.style("opacity", 0);
        });

      // Convert to array and sort by sales
      const topCountriesData = Array.from(
        salesByCountry,
        ([country, totalSales]) => ({
          country,
          totalSales,
          formattedSales: totalSales.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
          }),
        })
      )
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 10); // Get top 10 countries

      // Set up dimensions and margins
      const topCountriesMargin = {
        top: 20,
        right: 60,
        bottom: 80,
        left: 20,
      };
      const topCountriesWidth =
        containerWidth - topCountriesMargin.left - topCountriesMargin.right;
      const topCountriesHeight =
        400 - topCountriesMargin.top - topCountriesMargin.bottom;

      // Create SVG container
      const topCountriesSvg = d3
        .select("#top-countries-chart")
        .attr(
          "width",
          topCountriesWidth + topCountriesMargin.left + topCountriesMargin.right
        )
        .attr(
          "height",
          topCountriesHeight +
            topCountriesMargin.top +
            topCountriesMargin.bottom
        )
        .append("g")
        .attr(
          "transform",
          `translate(${topCountriesMargin.left},${topCountriesMargin.top})`
        );

      // Create color scale
      const colorScale = d3
        .scaleSequential(d3.interpolateReds)
        .domain([0, d3.max(topCountriesData, (d) => d.totalSales)]);

      // Create treemap layout
      const treemap = (data) =>
        d3
          .treemap()
          .size([topCountriesWidth, topCountriesHeight])
          .padding(1)
          .round(true)(
          d3
            .hierarchy({ children: data })
            .sum((d) => d.totalSales)
            .sort((a, b) => b.value - a.value)
        );

      const root = treemap(topCountriesData);

      // Create cells
      const cell = topCountriesSvg
        .selectAll("g")
        .data(root.leaves())
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

      // Add rectangles
      cell
        .append("rect")
        .attr("width", (d) => d.x1 - d.x0)
        .attr("height", (d) => d.y1 - d.y0)
        .attr("fill", (d) => colorScale(d.data.totalSales))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .on("mouseover", function (event, d) {
          d3.select(this).transition().duration(200).attr("opacity", 0.8);

          tooltip
            .style("opacity", 1)
            .html(
              `
        <strong>${d.data.country}</strong><br>
        Total de Ventas: ${d.data.formattedSales}
        `
            )
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 10 + "px");
        })
        .on("mouseout", function () {
          d3.select(this).transition().duration(200).attr("opacity", 1);
          tooltip.style("opacity", 0);
        });

      // Add labels
      cell
        .append("text")
        .attr("x", 4)
        .attr("y", 18)
        .attr("fill", "#fff")
        .attr("font-weight", "bold")
        .style("stroke", "#000")
        .style("stroke-width", "0.8px")
        .style("paint-order", "stroke")
        .style("font-size", "15px")
        .text((d) => d.data.country);

      cell
        .append("text")
        .attr("x", 4)
        .attr("y", 36)
        .attr("fill", "#fff")
        .style("stroke", "#000")
        .style("stroke-width", "0.8px")
        .style("paint-order", "stroke")
        .text((d) => d3.format(".2s")(d.data.totalSales));

      // Add gradient stops
      const stops = [0, 0.25, 0.5, 0.75, 1];
      stops.forEach((stop, i) => {
        gradient
          .append("stop")
          .attr("offset", `${stop * 100}%`)
          .attr("stop-color", d3.interpolateReds(stop));
      });

      const salesByProduct = d3.rollup(
        data,
        (v) => d3.sum(v, (d) => +d.sales),
        (d) => d.product_name
      );

      // Convert to array and sort by sales
      const topProductsData = Array.from(
        salesByProduct,
        ([product, totalSales]) => ({
          product,
          totalSales,
          formattedSales: totalSales.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
          }),
        })
      )
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 10); // Get top 10 products

      // Set up dimensions and margins
      const topProductsMargin = {
        top: 20,
        right: 20,
        bottom: 30,
        left: 40,
      };
      const topProductsWidth =
        containerWidth - topProductsMargin.left - topProductsMargin.right;
      const topProductsHeight =
        400 - topProductsMargin.top - topProductsMargin.bottom;

      // Create SVG container
      const topProductsSvg = d3
        .select("#top-products-chart")
        .attr(
          "width",
          topProductsWidth + topProductsMargin.left + topProductsMargin.right
        )
        .attr(
          "height",
          topProductsHeight + topProductsMargin.top + topProductsMargin.bottom
        )
        .append("g")
        .attr(
          "transform",
          `translate(${topProductsMargin.left},${topProductsMargin.top})`
        );

      // Create scales
      const yScale = d3
        .scaleBand()
        .range([0, topProductsHeight])
        .domain(topProductsData.map((d) => d.product))
        .padding(0.3);

      const xScale = d3
        .scaleLinear()
        .range([0, topProductsWidth])
        .domain([0, d3.max(topProductsData, (d) => d.totalSales)]);

      // Add X axis
      topProductsSvg
        .append("g")
        .attr("transform", `translate(0,${topProductsHeight})`)
        .call(
          d3
            .axisBottom(xScale)
            .ticks(5)
            .tickFormat((d) => d3.format("$.2s")(d))
        )
        .selectAll("text")
        .style("font-size", "12px");

      // Add Y axis
      topProductsSvg
        .append("g")
        .call(d3.axisLeft(yScale))
        .selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", "bold");

      // Add Y axis label
      topProductsSvg
        .append("text")
        .attr("class", "axis-label")
        //.attr('transform', 'rotate(180)')
        .attr("y", -topProductsMargin.left + 10) // Move up by 20 pixels
        .attr("x", 0 - topProductsHeight / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "18px")
        .text("Product Name");

      // Add X axis label
      topProductsSvg
        .append("text")
        .attr("class", "axis-label")
        .attr(
          "transform",
          `translate(${topProductsWidth / 2}, ${
            topProductsHeight + topProductsMargin.bottom - 5
          })`
        )
        .style("text-anchor", "middle")
        .style("font-size", "18px")
        .text("Total de Ventas ($)");

      // Add bars
      topProductsSvg
        .selectAll(".bar")
        .data(topProductsData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", (d) => yScale(d.product))
        .attr("width", 0) // Start with 0 width for animation
        .attr("height", yScale.bandwidth())
        .attr("fill", "#FF6B6B")
        .attr("rx", 4) // Rounded corners
        .on("mouseover", function (event, d) {
          d3.select(this).transition().duration(200).attr("opacity", 0.8);

          tooltip
            .style("opacity", 1)
            .html(
              `
        <strong>${d.product}</strong><br>
        Total de Ventas: ${d.formattedSales}
        `
            )
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 10 + "px");
        })
        .on("mouseout", function () {
          d3.select(this).transition().duration(200).attr("opacity", 1);
          tooltip.style("opacity", 0);
        });

      // Animate bars
      topProductsSvg
        .selectAll(".bar")
        .transition()
        .duration(1000)
        .delay((d, i) => i * 100)
        .attr("width", (d) => xScale(d.totalSales));

      // Add value labels at the end of bars
      topProductsSvg
        .selectAll(".value-label")
        .data(topProductsData)
        .enter()
        .append("text")
        .attr("class", "value-label")
        .attr("x", (d) => xScale(d.totalSales) + 5)
        .attr("y", (d) => yScale(d.product) + yScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .style("opacity", 0)
        .text((d) => d.formattedSales)
        .transition()
        .duration(1000)
        .delay((d, i) => i * 100 + 500)
        .style("opacity", 1);

      // Add grid lines
      topProductsSvg
        .selectAll(".grid-line")
        .data(xScale.ticks(5))
        .enter()
        .append("line")
        .attr("class", "grid-line")
        .attr("x1", (d) => xScale(d))
        .attr("x2", (d) => xScale(d))
        .attr("y1", 0)
        .attr("y2", topProductsHeight);

      console.log("Gráficos generados correctamente");
    })
    .catch((error) => {
      console.error("Error loading CSV:", error);
    });
});

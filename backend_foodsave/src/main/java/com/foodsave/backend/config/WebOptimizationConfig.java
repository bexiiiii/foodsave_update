package com.foodsave.backend.config;

import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.util.List;

@Configuration
public class WebOptimizationConfig implements WebMvcConfigurer {

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> compressionCustomizer() {
        return factory -> {
            factory.addConnectorCustomizers(connector -> {
                connector.setProperty("compression", "on");
                connector.setProperty("compressionMinSize", "1024");
                connector.setProperty("compressableMimeType", 
                    "text/html,text/xml,text/plain,text/css,text/javascript," +
                    "application/javascript,application/json,application/xml");
            });
        };
    }

    @Override
    public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
        // Оптимизация JSON сериализации
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        ObjectMapper mapper = new ObjectMapper();
        
        // Настройки для оптимизации JSON
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.disable(SerializationFeature.FAIL_ON_EMPTY_BEANS);
        
        converter.setObjectMapper(mapper);
        converters.add(0, converter);
    }
}
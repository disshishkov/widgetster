module.exports = function(grunt) 
{   
    grunt.initConfig(
    {
        pkg: grunt.file.readJSON("package.json"),
        meta:
        {
            banner: '/*<%= pkg.name %> - v<%= pkg.version %>'
                    + '\n<%= pkg.site %>'
                    + '\nCopyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %>'
                    + '\nOriginal plugin: <%= pkg.originalPlugin.name %>(<%= pkg.originalPlugin.homepage %>) by <%= pkg.originalPlugin.author.name %>*/'
        },
        ts:
        {
            options:
            {
                target: "es3",
                module: "commonjs",
                sourcemap: false
            },
            tsc:
            {
                src: ["ts/Widgetster.ts"],
                out: "js/<%= pkg.pluginName %>.js"
            }
        },
        uglify: 
        {
            options: 
            {
                banner: "<%= meta.banner %>"
            },
            js: 
            {
                files: 
                { 
                    "<%= ts.tsc.out %>.min.js": ["<%= ts.tsc.out %>"] 
                }
            }
        },
        cssmin:
        {
            compress:
            {
                options:
                {
                    banner: "<%= meta.banner %>"
                },
                files:
                {
                    "css/<%= pkg.pluginName %>.css": ["css/<%= pkg.pluginName %>.min.css"]
                }
            }
        }
    });

    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-cssmin");

    grunt.registerTask("default", ["ts", "uglify", "cssmin"]);
};
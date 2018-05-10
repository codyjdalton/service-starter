/**
 * compiler.class
 */
import express = require('express');
import BodyParser = require('body-parser');

import { Application } from 'express';

import { CoreCompiler, ILitComponent, ILitModule } from '../utils/compiler.utils';
import { HttpServer } from '../../http/utils/http.utils';
import { HttpResponse } from '../../http/classes/response.class';
import { Injector } from './injector.class';

export class ServiceCompiler extends CoreCompiler {

    app: Application = express();
    server: HttpServer;

    /**
     * @function bootstrap
     * @param {ILitModule} Parent - Usually the app.module
     * @param {number} port - defaults to 3000
     * 
     * Usage:
     * @LitModule()
     * class AppComponent {}
     * 
     * LitCompiler.bootstrap(AppComponent)
     */
    bootstrap(Parent: ILitModule, port: string | number = 3000): void {

        // override port
        port = process.env.port || port;

        // add our body parser
        this.addParser();

        // and unpack the parent module
        this.unpack(Parent);

        // finally, listen on our input port
        this.server = this.app.listen(port, this.greet(port));
    }

    /**
     * @function addParser
     * Usage:
     * LitCompiler.addParser();
     * 
     * Adds body parser to this.app
     */
    addParser(): void {

        // add body parser support
        // parse application/x-www-form-urlencoded
        this.app.use(BodyParser.urlencoded({ extended: false }));

        // parse application/json
        this.app.use(BodyParser.json());
    }

    /**
     * @function unpack
     * @param {GenericModule} Parent 
     * @param {path} inputPath
     */
    unpack(Parent: ILitModule, inputPath: string = ''): void {
        
        const path = this.getPath([
            inputPath,
            Injector.get(Parent, 'path', '')
        ]);
        const imports = Injector.get(Parent, 'imports', []);

        // add parent imports first
        this.addExportedComponents(path, Injector.get(Parent, 'exports', []));

        imports.forEach((Child: ILitModule) => this.unpack(Child, path));
    }

    /**
     * @function getMethodList
     * @param {ILitComponent} target
     */
    getMethodList(Component: ILitComponent): string[] {
        return Object.getOwnPropertyNames(Component.prototype)
                     .filter(
                        (name: string) => name !== 'constructor' // <-- maybe someday
                     );
    }

    /**
     * @function getPath
     * @param {string[]} parts
     * Usage:
     * LitCompiler.getPath(['some', '', 'path']);
     * 
     * returns: 'some/path'
     */
    getPath(parts: (string | null | undefined)[]): string {
        return parts.filter(
            part => part
        ).join('/');
    }

    /**
     * @function getHandler
     * @param {ILitComponent} aComponent 
     * @param {string} name
     */
    getHandler(aComponent: ILitComponent, name: string) {
        return (req: any, res: any) => {

            // include metadata to send with response
            const meta: Object = Injector.getAll(
                aComponent,
                name
            );

            aComponent[name](req, new HttpResponse(res, meta));
        };
    }

    /**
     * @function addRoute
     * @param {string} method 
     * @param {string} path 
     * @param {string} aComponent 
     * @param {string} name
     * Usage:
     * 
     * LitCompiler.addRoute('post', 'some/route' aComponent, 'someMethod');
     * 
     * Sets:
     * POST /some/route
     * adds handler aComponent.someMethod
     */
    addRoute(method: string, path: string, aComponent: ILitComponent, name: string): void {
        this.app[method]('/' + path, this.getHandler(aComponent, name));
    }

    /**
     * @function addRouteFromMethod
     * @param {ILitComponent} Component 
     * @param {string} method 
     * @param {string} path 
     * 
     * Usage:
     * If SomeComponent has a @GetMapping with a method of 'getStuff'
     * LitCompiler.addRouteFromMethod(SomeComponent, 'getStuff', 'path/to/stuff')
     * 
     * adds route:
     * GET /path/to/stuff
     * SomeComponent.getStuff
     */
    addRouteFromMethod(Component: ILitComponent, method: string, path: string) {

        // get a new instance of the component
        const aComponent: ILitComponent = Injector.resolve(Component);
        const reqMethod: string = Injector.get(aComponent, 'method', null, method);

        // check if method is elligible for route and add
        if(reqMethod) {

            path = this.getPath([
                path,
                Injector.get(aComponent, 'path', null, method)
            ]);
            
            this.addRoute(reqMethod, path, aComponent, method);
        }
    }

    /**
     * @function addExportedComponents
     * @param {string} path 
     * @param {ILitComponent[]} includes 
     * Usage:
     * const moduleExports: LitComponent[] = [ SomeComponent, AnotherComponent ];
     * 
     * // Adds all component routes for each, prefixing the path with 'root'.
     * LitCompiler.addExportedComponents('root', moduleExports);
     */
    addExportedComponents(path: string, includes: ILitModule[]): void {
        includes.forEach(
            (Component: ILitComponent) => {
                this.getMethodList(Component).forEach(
                    (method: string) => this.addRouteFromMethod(Component, method, path)
                );
            } 
        );
    }

    /**
     * @function greet
     * @param {number} port
     * Usage:
     * LitCompiler.greet(1000)()
     * 
     * logs: Application running on port 1000
     */
    greet(port: string | number = ''): Function {
        return () => {
            this.console.log("Application running on port " + port);
        }
    }
}

export const LitCompiler: ServiceCompiler = Injector.resolve(ServiceCompiler);
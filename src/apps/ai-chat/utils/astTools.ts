import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import MagicString from 'magic-string';

/**
 * AST-based code modification tools for the AI Builder.
 * Uses @babel/parser for accurate location finding and magic-string for minimal-change edits.
 */

// Helper to parse code with necessary plugins
const parseCode = (code: string) => {
    return parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
    });
};

export const AstTools = {
    /**
     * Adds an import statement to the file if it doesn't exist.
     */
    addImport: (code: string, importCode: string): string => {
        try {
            const ast = parseCode(code);
            const s = new MagicString(code);
            
            let lastImportEnd = 0;
            let exists = false;

            // Simple check to avoid duplicates (can be improved with AST analysis)
            // We normalize whitespace for the check
            const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();
            if (normalize(code).includes(normalize(importCode))) {
                return code;
            }

            traverse(ast, {
                ImportDeclaration(path) {
                    lastImportEnd = path.node.end || 0;
                }
            });

            if (lastImportEnd > 0) {
                s.appendRight(lastImportEnd, '\n' + importCode);
            } else {
                s.prepend(importCode + '\n');
            }

            return s.toString();
        } catch (e) {
            console.error('AST Parse Error in addImport:', e);
            // Fallback to simple prepend if parsing fails
            return importCode + '\n' + code;
        }
    },

    /**
     * Inserts JSX code into a React component.
     * @param code The source code
     * @param componentName The name of the component to modify
     * @param targetElement The JSX element to insert into/after (e.g., "div", "Header", or empty for the main wrapper)
     * @param position 'prepend' | 'append' | 'before' | 'after'
     * @param jsxCode The JSX code to insert
     */
    insertJsx: (
        code: string, 
        componentName: string, 
        targetElement: string | null, // If null, targets the root element of the return statement
        position: 'prepend' | 'append' | 'before' | 'after', 
        jsxCode: string
    ): string => {
        try {
            const ast = parseCode(code);
            const s = new MagicString(code);
            let found = false;

            traverse(ast, {
                FunctionDeclaration(path) {
                    if (path.node.id?.name === componentName) {
                        // Found the component
                        path.traverse({
                            ReturnStatement(returnPath) {
                                if (found) return; // Only handle the first return for now
                                
                                const arg = returnPath.node.argument;
                                if (!arg) return;

                                // Helper to handle insertion based on node
                                const handleInsertion = (node: t.Node) => {
                                    if (position === 'before') {
                                        s.appendLeft(node.start!, jsxCode + '\n');
                                        found = true;
                                    } else if (position === 'after') {
                                        s.appendRight(node.end!, '\n' + jsxCode);
                                        found = true;
                                    } else if (t.isJSXElement(node) || t.isJSXFragment(node)) {
                                        // For append/prepend, we need to be inside the element
                                        const closingElement = t.isJSXElement(node) ? node.closingElement : (node as t.JSXFragment).closingFragment;
                                        const openingElement = t.isJSXElement(node) ? node.openingElement : (node as t.JSXFragment).openingFragment;

                                        if (position === 'prepend' && openingElement) {
                                            s.appendRight(openingElement.end!, '\n' + jsxCode);
                                            found = true;
                                        } else if (position === 'append' && closingElement) {
                                            s.appendLeft(closingElement.start!, jsxCode + '\n');
                                            found = true;
                                        }
                                    }
                                };

                                if (!targetElement) {
                                    // Target the root returned element
                                    handleInsertion(arg);
                                } else {
                                    // Search for specific target element inside the return statement
                                    // We need to traverse the sub-tree of the return argument
                                    // Since babel traverse doesn't support sub-tree traversal easily without visitor,
                                    // we can use a manual recursive search or a scoped traverse if we had the path.
                                    // But we only have the node here if we use node traversal.
                                    // Let's use the returnPath.traverse to find the target JSXElement
                                    
                                    returnPath.traverse({
                                        JSXOpeningElement(jsxPath) {
                                            if (found) return;
                                            const nameNode = jsxPath.node.name;
                                            let name = '';
                                            if (t.isJSXIdentifier(nameNode)) {
                                                name = nameNode.name;
                                            }
                                            
                                            if (name === targetElement) {
                                                // Found target!
                                                // We need the parent JSXElement, not just the opening tag
                                                const parent = jsxPath.parent;
                                                handleInsertion(parent);
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    }
                },
                // Handle arrow functions assigned to variables
                VariableDeclarator(path) {
                    if (t.isIdentifier(path.node.id) && path.node.id.name === componentName) {
                        const init = path.node.init;
                        if (t.isArrowFunctionExpression(init) || t.isFunctionExpression(init)) {
                            // Similar logic for arrow functions
                             path.traverse({
                                ReturnStatement(returnPath) {
                                    if (found) return;
                                    const arg = returnPath.node.argument;
                                    if (!arg) return;

                                    const handleInsertion = (node: t.Node) => {
                                        if (position === 'before') {
                                            s.appendLeft(node.start!, jsxCode + '\n');
                                            found = true;
                                        } else if (position === 'after') {
                                            s.appendRight(node.end!, '\n' + jsxCode);
                                            found = true;
                                        } else if (t.isJSXElement(node) || t.isJSXFragment(node)) {
                                            const closingElement = t.isJSXElement(node) ? node.closingElement : (node as t.JSXFragment).closingFragment;
                                            const openingElement = t.isJSXElement(node) ? node.openingElement : (node as t.JSXFragment).openingFragment;

                                            if (position === 'prepend' && openingElement) {
                                                s.appendRight(openingElement.end!, '\n' + jsxCode);
                                                found = true;
                                            } else if (position === 'append' && closingElement) {
                                                s.appendLeft(closingElement.start!, jsxCode + '\n');
                                                found = true;
                                            }
                                        }
                                    };

                                    if (!targetElement) {
                                        handleInsertion(arg);
                                    } else {
                                        returnPath.traverse({
                                            JSXOpeningElement(jsxPath) {
                                                if (found) return;
                                                const nameNode = jsxPath.node.name;
                                                let name = '';
                                                if (t.isJSXIdentifier(nameNode)) name = nameNode.name;
                                                
                                                if (name === targetElement) {
                                                    handleInsertion(jsxPath.parent);
                                                }
                                            }
                                        });
                                    }
                                },
                                // Handle implicit return in arrow functions: () => <div />
                                JSXElement(jsxPath) {
                                    if (found) return;
                                    // If the arrow function body is just this JSXElement (implicit return)
                                    if (jsxPath.parent === init) {
                                         const handleInsertion = (node: t.Node) => {
                                            if (position === 'before') {
                                                s.appendLeft(node.start!, jsxCode + '\n');
                                                found = true;
                                            } else if (position === 'after') {
                                                s.appendRight(node.end!, '\n' + jsxCode);
                                                found = true;
                                            } else if (t.isJSXElement(node) || t.isJSXFragment(node)) {
                                                const closingElement = t.isJSXElement(node) ? node.closingElement : (node as t.JSXFragment).closingFragment;
                                                const openingElement = t.isJSXElement(node) ? node.openingElement : (node as t.JSXFragment).openingFragment;

                                                if (position === 'prepend' && openingElement) {
                                                    s.appendRight(openingElement.end!, '\n' + jsxCode);
                                                    found = true;
                                                } else if (position === 'append' && closingElement) {
                                                    s.appendLeft(closingElement.start!, jsxCode + '\n');
                                                    found = true;
                                                }
                                            }
                                        };
                                        
                                        if (!targetElement) {
                                            handleInsertion(jsxPath.node);
                                        } else {
                                            // Traversal for target element inside implicit return is harder because we are already at the root.
                                            // But we can traverse the current path.
                                            jsxPath.traverse({
                                                JSXOpeningElement(innerPath) {
                                                    if (found) return;
                                                    // Skip self if target is generic (handled above), but if target is specific...
                                                    const nameNode = innerPath.node.name;
                                                    let name = '';
                                                    if (t.isJSXIdentifier(nameNode)) name = nameNode.name;
                                                    
                                                    if (name === targetElement) {
                                                        handleInsertion(innerPath.parent);
                                                    }
                                                }
                                            });
                                        }
                                    }
                                }
                            });
                        }
                    }
                }
            });

            if (!found) {
                throw new Error(`Target component '${componentName}' or element '${targetElement || 'root'}' not found.`);
            }

            return s.toString();
        } catch (e: any) {
            throw new Error(`AST Error in insertJsx: ${e.message}`);
        }
    }
};

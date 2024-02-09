declare type Expression =
	| TypeReference
	| LiteralExpression
	| PrimitiveExpression
	| ArrayExpression
	| ObjectExpression
	| PromiseExpression
	| UnionExpression
	| IntersectionExpression
	| UnknownExpression

declare type TypeReference = {
	type: "type"
	reference: Type
}

declare type LiteralExpression = {
	type: "literal"
	value: string | number | boolean | null
}

declare type PrimitiveExpression = {
	type: "primitive"
	kind: "Date" | "string" | "number" | "boolean" | "null" | "undefined" | "any"
}

declare type ArrayExpression = {
	type: "array"
	value: Expression
}

declare type ObjectExpression = {
	type: "object"
	properties: { [key: string]: Expression }
	dynamic?: Expression
}

declare type PromiseExpression = {
	type: "promise"
	value: Expression
}

declare type UnionExpression = {
	type: "union"
	values: Expression[]
}

declare type IntersectionExpression = {
	type: "intersection"
	values: Expression[]
}

declare type UnknownExpression = {
	type: "unknown"
}

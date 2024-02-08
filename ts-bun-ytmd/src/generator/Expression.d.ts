declare type Expression =
	| TypeReference
	| LiteralExpression
	| PrimitiveExpression
	| ArrayExpression
	| ObjectExpression
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
	type: "literal"
	value: "string" | "number" | "boolean" | "null"
}

declare type ArrayExpression = {
	type: "array"
	value: Expression
}

declare type ObjectExpression = {
	type: "object"
	value: { [key: string]: Expression }
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

import { expect } from "chai";
import * as util from "../../../src/testthat/util";

suite("testthat/util", () => {
    test("Can create a unique and expressive NodeID", async () => {
        // Initialize some example paths
        const testPath = "../tests/testthat/test-email.R";
        const testPath2 = "../tests/../test-email.R";
        const testPath3 = "C:\\Users\\test\\test-email.R";
        // Can normalize mixed paths
        expect(util.encodeNodeId(testPath, "test").replace(/[\\/]+/g, "/")).to.be.equal(
            "../tests/testthat/test-email.R&test"
        );
        expect(util.encodeNodeId(testPath2, "test2").replace(/[\\/]+/g, "/")).to.be.equal(
            "../test-email.R&test2"
        );
        expect(
            util.encodeNodeId(testPath3, "test3", "superlabel").replace(/[\\/]+/g, "/")
        ).to.be.equal("C:/Users/test/test-email.R&superlabel: test3");
    });
});
